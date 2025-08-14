const { exec } = require('child_process')   // run shell commands inside javascript code
const path = require('path')    // used to join path
const fs = require('fs')

const {S3Client, PutObjectCommand} = require('@aws-sdk/client-s3')

const mime = require('mime-types')

// Creating S3 Client -- providing communication things
const s3Client = new S3Client({
    region: '',
    credentials: {
        accessKeyId: '',
        secretAccessKey: ''
    }
})

// fetching projectID from .env
const projectID = process.env.projectID

async function init() {
    console.log('Starting build server...')
    const outputDir = path.join(__dirname, 'output')    // join this script folder with output i.e. /home/app -- __dirname and /output

    // Go inside folder and run npm install and npm build
    const p = exec(`cd ${outputDir} && npm install && npm run build`)

    // Produce all logs as output
    p.stdout.on('data', (data) => {
        console.log(data.toString())    // it is a buffer, convert to string
    })

    // Produce error as output if any
    p.stdout.on('error', (error) => {
        console.error('Error:', error.toString())    // it is a buffer, convert to string
    })

    // Wait for the process to finish
    p.on('close', async() => {
        console.log('Build Complete')
        
        // Npm run build makes dist/ folder, containing all static files
        const distFolderPath = path(__dirname, 'output', 'dist')
        const distFolderContents = fs.readdirSync(distFolderPath, {recursive: true})

        // Loop over all files and send them to s3 (not folder)
        for(const item of distFolderContents){
            if(fs.lstatSync(item).isDirectory()) continue;

            // create config to upload to s3
            const command = new PutObjectCommand({
                Bucket: '',
                Key: `__outputs/${projectID}/${item}`,    // The path, file is stored inside s3
                Body: fs.createReadStream(item),     // it divides file into chunks for uploading large objects easily
                ContentType: mime.lookup(item)
            })

            // Start uploading to S3
            await s3Client.send(command)

        }
    })
    
    console.log('Done....')
}


// All these are running inside Docker Container only