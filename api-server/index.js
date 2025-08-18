const express = require('express')
const { generateSlug } = require('random-word-slugs')
const { ECSClient, RunTaskCommand } = require('@aws-sdk/client-ecs')
 
require('dotenv').config()

const { Server } = require('socket.io')
const Redis = require('ioredis')

const { z } = require('zod')
const { PrismaClient } = require('@prisma/client')


const app = express()
const PORT = 9000


// Creating Prisma Client
const prisma = new PrismaClient({})

// Creating Redis Subscriber
const subscriber = new Redis(process.env.REDIS_URL)

subscriber.on('connect', () => console.log('Redis subscriber connected!'))
subscriber.on('ready', () => console.log('Redis subscriber ready!'))
subscriber.on('error', err => console.error('❌ Redis error:', err))
subscriber.on('end', () => console.log('❌ Redis connection closed'))

// ! Creating Socker Server
const io = new Server({ cors:'*' })     // Creating new socket server

// Joining Redis Channel for live updates
io.on('connection', socket => {
    // Subscribe to Redis
    socket.on('subscribe', channel => {     // if user wants to subscribe, specify the channel and socket will make him join that channel
        socket.join(channel)
        socket.emit('message', `Joined: ${channel}`)    // in events in postman, subscribe to message
    })
    console.log('Socket connected')
})

io.listen(9002, () => console.log('Socket server listening on port 9002'))


// * Creating a new ECS Client
const ecsClient = new ECSClient({
    region: 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
})

// Creating config for cluster
const config = {
    CLUSTER: 'arn:aws:ecs:ap-south-1:897722695334:cluster/builder-cluster',
    TASK: 'arn:aws:ecs:ap-south-1:897722695334:task-definition/build-task'
}

// we need to make express.json() -- to handle application/json requests
app.use(express.json())

app.post('/project', async(req,res) => {
    //const { name, gitURL } = req.body
    // ! But we need to validate the github link and name. So validating using ZOD

    // schema for validating
    const schema = z.object({
        name: z.string(),
        gitURL: z.string().url()   // zod will validate the URL
    })

    const safeParseResult = schema.safeParse(req.body);

    if(!safeParseResult) res.status(400).json({ error: 'Invalid data' });
    const { name, gitURL } = safeParseResult.data;
    
    // Creating new project with prisma-client
    const project = await PrismaClient.project.create({
        data: {
            name, 
            gitURL,
            subDomain: generateSlug()
        }
    })

    return res.json({ status: 'success', data: project })
})

app.post('/deploy', async(req,res) => {
    // const { projectId } = req.body // but we need to validate, so we can

    // Validating project ID through zod
    const schema = z.object({
        projectId: z.string()
    })

    const safeParseResult = schema.safeParse(req.body);
    if(!safeParseResult) return res.status(400).json({ error: 'Invalid data' });
    const { projectId } = safeParseResult.data;     // Fetch data from zod

    const projectSlug = generateSlug()  // generating unique slug for subdomain

    // Retrieve project
    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) { return res.status(404).json({ error: 'Project not found' }) }

    // Check if there is no running deployment
    const runningDeployment = await prisma.deployment.findFirst({ where: { id: projectId, status: { in: ['QUEUED', 'IN_PROGRESS'] } } })
    if (runningDeployment) { return res.status(400).json({ error: 'Deployment already in progress' }) }

    // Create new deployment
    const deployment = await prisma.deployment.create({
        data: {
            project: { connect: { id: projectId } },  // connecting to the project
            status: 'QUEUED',  // setting initial status to QUEUED
        }
    })

    // Spin the container using API Call
    const command = new RunTaskCommand({
        cluster: config.CLUSTER,
        taskDefinition: config.TASK,
        launchType: 'FARGATE',
        count: 1,
        networkConfiguration: {
            awsvpcConfiguration: {
                assignPublicIp: 'ENABLED',
                subnets: ['subnet-075d5e6f00b1896b7', 'subnet-0bc82775a5fbf6c60'],
                securityGroups: ['sg-02f85eb1cd16ddd2c'],
            }
        },
        // Giving Environment Variables
        overrides: {
            containerOverrides: [{
                name: 'builder-image',
                environment: [
                    { name: 'GIT_REPOSITORY__URL', value: project.gitURL},
                    { name: 'PROJECT_ID', value: projectId },
                    { name: 'DEPLOYMENT_ID', value: deployment.id },    // used for logs of deployment
                    { name: 'REDIS_URL', value: process.env.REDIS_URL },
                    { name: 'AWS_ACCESS_KEY_ID', value: process.env.AWS_ACCESS_KEY_ID },
                    { name: 'AWS_SECRET_ACCESS_KEY', value: process.env.AWS_SECRET_ACCESS_KEY }
                ]
            }]
        }
    })

    // send all this config to ECS Client
    await ecsClient.send(command)

    console.log('Container started successfully!')
    return res.json({ status: 'queued', data: { projectSlug, url: `http://${projectSlug}.localhost:8000` }})
})

// This will subscribe to redis, which will furthur send logs to socket
function subscribeToRedis() {
    // Subscribe to Redis Channel
    console.log('Subscribed to logs....')
    subscriber.psubscribe('logs:*')
    subscriber.on('pmessage', (pattern, channel, message) => {
        io.to(channel).emit('message', message)
    })
}

subscribeToRedis()

app.listen(PORT, () => {
    console.log(`API Server listening on port: ${PORT}`)
})