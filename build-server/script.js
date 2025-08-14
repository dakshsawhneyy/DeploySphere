const { exec } = require('child_process')   // run shell commands inside javascript code
const path = require('path')    // used to join path

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
    p.on('close', () => {
        console.log('Build Complete')
    })
}


// All these are running inside Docker Container only