const express = require('express')
const httpProxy = require('http-proxy')

const app = express()

const BASE_PATH = 'https://vercel-clone-mega-project.s3.ap-south-1.amazonaws.com/__outputs'

const proxy = httpProxy.createProxy();

// Catch every request on port 8000
app.use((req, res) => {
    const hostname = req.hostname;      // catch full hostname
    const subdomain = hostname.split('.')[0];   // catch starting subdomain

    const resolvesTo = `${BASE_PATH}/${subdomain}`

    // Using Proxy to redirect request
    proxy.web(req, res, { target: resolvesTo, changeOrigin: true })
})

// user need to specify file path, we can direct / to index.html
proxy.on('proxyReq', (proxyReq, req, res) => {
    const url = req.url;
    if(url == '/'){
        proxyReq.path += 'index.html'   // Append the index.html to proxyReq path automatically
    }
})

app.listen('8000', () => {
    console.log('Reverse Proxy is running on port 8000')
})