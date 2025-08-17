const express = require('express')
const { generateSlug } = require('random-word-slugs')
const { ECSClient, RunTaskCommand } = require('@aws-sdk/client-ecs')
 
require('dotenv').config()

const { Server } = require('socket.io')
const Redis = require('ioredis')

const app = express()
const PORT = 9000

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
    const { gitURL } = req.body
    const projectSlug = generateSlug()  // generating unique slug for subdomain

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
                    { name: 'GIT_REPOSITORY__URL', value: gitURL},
                    { name: 'PROJECT_ID', value: projectSlug },
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
    console.log('Subscribing to Redis logs channel...')
    subscriber.psubscribe('logs:*') // p means pattern and subscribe to all logs starting with logs:
    subscriber.on('pmessage', (pattern, channel, message) => {
        subscriber.psubscribe('logs:*')
        subscriber.on('pmessage', (pattern, channel, message) => {
            io.to(channel).emit('message', message)
        })
    })
}

subscribeToRedis()

app.listen(PORT, () => {
    console.log(`API Server listening on port: ${PORT}`)
})