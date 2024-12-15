import express from 'express'
import cors from 'cors'
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware'

const app = express()
const PORT = 9000

// Enable CORS for extension
app.use(cors({
  origin: '*', // Be more specific in production
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`)
  next()
})

// Proxy middleware configuration
const proxyOptions = {
  target: 'http://api.mochimo.org:8888',
  changeOrigin: true,
  pathRewrite: {
    '^/api': '' // Remove /api prefix when forwarding
  },
  onProxyRes: (proxyRes, req, res) => {
    proxyRes.headers['Access-Control-Allow-Origin'] = '*'
    
    // Log response status
    console.log(`${new Date().toISOString()} - Response: ${proxyRes.statusCode}`)
    
    // Handle binary responses (for raw blocks)
    if (req.path.startsWith('/api/bc/raw/')) {
      proxyRes.headers['content-type'] = 'application/octet-stream'
    }
  },
  onProxyReq: (proxyReq, req, res) => {
    // Handle POST requests with JSON body
    if (req.method === 'POST' && req.body) {
      const bodyData = JSON.stringify(req.body)
      proxyReq.setHeader('Content-Type', 'application/json')
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData))
      proxyReq.write(bodyData)
    }
  },
  onError: (err, req, res) => {
    console.error('Proxy Error:', err)
    res.status(500).json({
      status: 'error',
      error: 'Proxy Error',
      message: err.message
    })
  }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'success',
    data: {
      timestamp: new Date().toISOString()
    }
  })
})

// Proxy all /api/* requests to Mochimo TestNet
app.use('/api', createProxyMiddleware({
  ...proxyOptions,
  onProxyReq: fixRequestBody
}))

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server Error:', err)
  res.status(500).json({
    status: 'error',
    error: 'Server Error',
    message: err.message
  })
})

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`)
}) 