const express = require('express')
const { generateSlug } = require('random-word-slugs')
const { ECSClient, RunTaskCommand } = require('@aws-sdk/client-ecs')
 
require('dotenv').config()

// const { Server } = require('socket.io')
// const Redis = require('ioredis')

const { Kafka } = require('kafkajs')
const { createClient } = require('@clickhouse/client')

const { z, string } = require('zod')    // Powerful Library for validation

const { PrismaClient } = require('@prisma/client')

const cors = require('cors')
const path = require('path')
const fs = require('fs')
const { v4:uuid } = require('uuid')


const app = express()
app.use(cors());    // need to implement this in frontend
const PORT = 9000


// * Creating Prisma Client
const prisma = new PrismaClient({})

// * Creating Clickhouse CLient  --  by this we can execute queries
const clickhouse = createClient({
    url: process.env.CLICKHOUSE_HOST,
    username: process.env.CLICKHOUSE_USER,
    password: process.env.CLICKHOUSE_PASSWORD,
    database: process.env.CLICKHOUSE_DATABASE,
})


// * Creating Kafka Instance
const kafka = new Kafka({
    brokers: [process.env.KAFKA_BROKER],
    clientId: `api-server`,   // one project can have multiple deployments
    ssl: {
        ca: [fs.readFileSync(path.join(__dirname, 'kafka.pem'), 'utf-8')]
    },
    sasl: {
        username: process.env.KAFKA_USERNAME,
        password: process.env.KAFKA_PASSWORD,
        mechanism: 'plain'
    }
})

// * Creating Kafka Consumer
const consumer = kafka.consumer({ groupId: `api-server-group` })    // Name of Consumer Group


// Creating Redis Subscriber
// const subscriber = new Redis(process.env.REDIS_URL)

// subscriber.on('connect', () => console.log('Redis subscriber connected!'))
// subscriber.on('ready', () => console.log('Redis subscriber ready!'))
// subscriber.on('error', err => console.error('Redis error:', err))
// subscriber.on('end', () => console.log('Redis connection closed'))

// ! Creating Socker Server
// const io = new Server({ cors:'*' })     // Creating new socket server

// Joining Redis Channel for live updates
// io.on('connection', socket => {
//     // Subscribe to Redis
//     socket.on('subscribe', channel => {     // if user wants to subscribe, specify the channel and socket will make him join that channel
//         socket.join(channel)
//         socket.emit('message', `Joined: ${channel}`)    // in events in postman, subscribe to message as message is event
//     })
//     console.log('Socket connected')
// })

// io.listen(9002, () => console.log('Socket server listening on port 9002'))


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
    const project = await prisma.project.create({
        data: {
            name, 
            gitURL,
            subDomain: generateSlug()
        }
    })

    return res.json({ status: 'success', data: project })
})

// ! Route for fetching all projects
app.get('/project/:id', async(req,res) => {
    const id = req.params.id;

    try {
        // fetching project from prisma
        const project = await prisma.project.findUnique({
            where: {id: id}
        })

        if (!project) { return res.status(404).json({ error: 'Project not found' }) }

        return res.json({ status: 'success', data: project })
    } catch (error) {
        console.error('Error fetching project:', error)
    }
    
})

// ! Route for deploying project by taking projectID in req.body
app.post('/deploy', async(req,res) => {
    // const { projectId } = req.body // but we need to validate, so we can

    // Validating project ID through zod
    const schema = z.object({
        projectId: z.string()
    })

    const safeParseResult = schema.safeParse(req.body);
    if(!safeParseResult) return res.status(400).json({ error: 'Invalid data' });
    const { projectId } = safeParseResult.data;     // Fetch data from zod


    // Retrieve project
    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) { return res.status(404).json({ error: 'Project not found' }) }

    // Check if there is no running deployment
    //const runningDeployment = await prisma.deployment.findFirst({ where: { id: projectId, status: { in: ['QUEUED', 'IN_PROGRESS'] } } })
    //if (runningDeployment) { return res.status(400).json({ error: 'Deployment already in progress' }) }

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
                    { name: 'subDomain', value: project.subDomain },   // used for subdomain
                    { name: 'KAFKA_BROKER', value: process.env.KAFKA_BROKER },
                    { name: 'KAFKA_USERNAME', value: process.env.KAFKA_USERNAME },
                    { name: 'KAFKA_PASSWORD', value: process.env.KAFKA_PASSWORD },
                    { name: 'AWS_ACCESS_KEY_ID', value: process.env.AWS_ACCESS_KEY_ID },
                    { name: 'AWS_SECRET_ACCESS_KEY', value: process.env.AWS_SECRET_ACCESS_KEY }
                ]
            }]
        }
    })

    // send all this config to ECS Client
    await ecsClient.send(command)

    console.log('Container started successfully!')
    return res.json({ status: 'queued', data: { "project": project, "deployment": deployment }})
})


// ! Route for fetching Logs
app.get('/logs/:id', async (req, res) => {
    const id = req.params.id;

    // fetching logs from clickhouse based on deployment_id
    const logs = await clickhouse.query({
        query: `SELECT event_id, deployment_id, log, timestamp FROM log_events WHERE deployment_id = {deployment_id:String}`,
        query_params: { deployment_id: id },
        format: 'JSONEachRow'
    })

    // console.log('logs', logs)
    
    const rawLogs = await logs.json()
    console.log('logs:', rawLogs)

    // Returning Logs
    return res.json({ status: 'success', logs: rawLogs })
}) 


// This will subscribe to redis, which will furthur send logs to socket
// function subscribeToRedis() {
//     // Subscribe to Redis Channel
//     console.log('Subscribed to logs....')
//     subscriber.psubscribe('logs:*')
//     subscriber.on('pmessage', (pattern, channel, message) => {
//         io.to(channel).emit('message', message)
//     })
// }
// subscribeToRedis()

async function kafkaConsumer() {
    await consumer.connect()
    await consumer.subscribe({ topic: 'container-logs' });    // subscribe to topic
    console.log('Kafka Consumer connected and subscribed to `container-logs` topic')

    await consumer.run({
        autoCommit: false,  // kafka automatically commit offset, but here we doing manually

        // Instead of processing one message at a time, process them in batches or chunks
        eachBatch: async function ({ batch, heartbeat, commitOffsetsIfNecessary, resolveOffset }) {     
            const messages = batch.messages
            // console.log(`Recvd. ${messages.length} messages...`)

            // Looping over messages
            for (const message of messages) {
                // Converting message into JS Object fron JS String
                const stringMessage = message.value.toString();     // it is in buffer, converting it into string
                const { PROJECT_ID, DEPLOYMENT_ID, log, subDomain } = JSON.parse(stringMessage);    // parsing the string to JSON
            
                try {
                    // Inserting into clickhouse
                    const {query_id} = await clickhouse.insert({    // inserting as per the table
                        table: 'log_events',
                        values: [{ event_id: uuid(), deployment_id: DEPLOYMENT_ID, log: log }],
                        format: 'JSONEachRow'
                    })

                    console.log({log, subDomain, DEPLOYMENT_ID})
                    // console.log(query_id)

                    // Offset Handling -- sequence no. in Kafka. It helps remember kafka where we had left off
                    commitOffsetsIfNecessary(message.offset)    // telling Kafka: “I’m done with all messages up to this offset. You don’t need to send them again if I crash.”
                    resolveOffset(message.offset)     // mark messages as processed (local)
                    await heartbeat();  // if consumer goes quiet for too long, kafka kicks it out of the group
                    // console.log(`Log inserted into ClickHouse: ${log}`)
                } catch (error) {
                    console.error('Error inserting log into ClickHouse:', error)
                }
                
            }
        }
    })
}

kafkaConsumer()

app.listen(PORT, () => {
    console.log(`API Server listening on port: ${PORT}`)
}) 