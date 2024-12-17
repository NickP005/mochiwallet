import express from 'express'
import cors from 'cors'
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware'

const app = express()
const PORT = 9000

const FOUNTAIN_URLS = [
  'http://fountain1.mochimo.com/fund',
  'http://fountain2.mochimo.com/fund',
  'http://fountain3.mochimo.com/fund',
  'http://fountain4.mochimo.com/fund'
]

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

// Add fountain endpoint
app.get('/api/fund/:wots', async (req, res) => {
  const { wots } = req.params
  console.log(`Attempting to fund WOTS: ${wots.slice(0, 64)}...`)

  // Try each fountain in sequence until one succeeds
  for (const fountainUrl of FOUNTAIN_URLS) {
    try {
      console.log(`Trying fountain: ${fountainUrl}`)
      const response = await fetch(`${fountainUrl}/${wots}`)
      const data = await response.text()

      console.log('Fountain response:', {
        url: fountainUrl,
        success: true,
        error: null,
        data: data
      })

      // If successful, return the response

      return res.json({
        success: true,
        data: data,
        fountain: fountainUrl
      })


    } catch (error) {
      console.error(`Error with fountain ${fountainUrl}:`, error)
      // Continue to next fountain on error
      continue // Don't send response here, try next fountain
    }
  }

  // If all fountains failed
  return res.json({
    success: false,
    error: 'All fountains failed to process the request',
    attempts: FOUNTAIN_URLS.length
  })
})

// Proxy all other /api/* requests to Mochimo TestNet
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