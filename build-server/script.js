const { exec } = require('child_process')   // run shell commands inside javascript code
const path = require('path')    // used to join path
const fs = require('fs')

const {S3Client, PutObjectCommand} = require('@aws-sdk/client-s3')

const mime = require('mime-types')

const Redis = require('ioredis')

// Creating S3 Client -- providing communication things
const s3Client = new S3Client({
    region: 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
})

// fetching projectID from .env
const projectID = process.env.projectID

// Creating Redis Publisher
const publisher = new Redis(process.env.REDIS_URL, {tls: {}})

// Publish logs to a specific channel
function publishLog(log){
    publisher.publish(`logs:${projectID}`, JSON.stringify({log}))   // send logs to logs:PROJECTID
    console.log('Published Log:', log)
}

async function init() {
    console.log('Starting build server...')
    const outputDir = path.join(__dirname, 'output')    // join this script folder with output i.e. /home/app -- __dirname and /output

    // Go inside folder and run npm install and npm build
    console.log('Output Directory:', outputDir)
    const p = exec(`cd ${outputDir} && npm install && npm run build`)

    // Produce all logs as output
    console.log('Running command:', `cd ${outputDir} && npm install && npm run build`)
    p.stdout.on('data', (data) => {
        console.log(data.toString())    // it is a buffer, convert to string
        publishLog(data.toString())
    })

    // Produce error as output if any
    p.on('error', (error) => {
        console.error('Error:', error.toString())    // it is a buffer, convert to string
        publishLog(`error: ${error.toString()}`)
    })

    console.log('Waiting for build to finish...')
    // Wait for the process to finish
    p.on('close', async() => {
        console.log('Build finished successfully!')
        
        // Npm run build makes dist/ folder, containing all static files
        const distFolderPath = path.join(__dirname, 'output', 'dist')
        const distFolderContents = fs.readdirSync(distFolderPath, {recursive: true})

        console.log('Contents of dist folder:', distFolderContents)

        publishLog(`Starting to upload`)

        // Loop over all files and send them to s3 (not folder)
        for(const item of distFolderContents){
            if(fs.lstatSync(item).isDirectory()) continue;

            // create config to upload to s3
            console.log('Processing file:', item)
            publishLog(`Uploading file: ${item}`)

            const command = new PutObjectCommand({
                Bucket: 'vercel-clone-mega-project',
                Key: `__outputs/${projectID}/${item}`,    // The path, file is stored inside s3
                Body: fs.createReadStream(item),     // it divides file into chunks for uploading large objects easily
                ContentType: mime.lookup(item)
            })

            // Start uploading to S3
            console.log('Uploading file to S3:', item)
            await s3Client.send(command)
            console.log('File uploaded successfully:', item)

            publishLog(`File uploaded successfully: ${item}`)
        }
    })
    
    console.log('Done....')
    publishLog(`Build server finished processing for project ${projectID}`)
}


// All these are running inside Docker Container only