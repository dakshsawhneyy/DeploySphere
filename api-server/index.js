const express = require('express')
const { generateSlug } = require('random-word-slugs')
const { ECSClient, RunTaskCommand } = require('@aws-sdk/client-ecs')
 
require('dotenv').config()

const app = express()
const PORT = 9000

// Creating a new ECS Client
const ecsClient = new ECSClient({
    region: 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AccessKeyId,
        secretAccessKey: process.env.SecretAccessKey
    }
})

// Creating config for cluster
const config = {
    CLUSTER: 'arn:aws:ecs:ap-south-1:897722695334:cluster/builder-cluster',
    TASK: 'arn:aws:ecs:ap-south-1:897722695334:task-definition/build-task'
}

// we need to make express.json() -- to handle application/json requests
app.use(express.json())

app.use('/project', async(req,res) => {
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
                    { name: 'projectID', value: projectSlug }
                ]
            }]
        }
    })

    // send all this config to ECS Client
    await ecsClient.send(command)

    console.log('Container started successfully!')
    return res.json({ status: 'queued', data: { projectSlug, url: `http://${projectSlug}.localhost:8000` }})
    
})

app.listen(PORT, () => {
    console.log(`API Server listening on port: ${PORT}`)
})