import express, { Request, Response, NextFunction, RequestHandler } from 'express'
import bodyParser from 'body-parser'
import dotenv from 'dotenv'
import { Setup, sdk } from '@bsv/wallet-toolbox'
import { createAuthMiddleware, AuthRequest } from '@bsv/auth-express-middleware'
import { PubKeyHex, VerifiableCertificate } from '@bsv/sdk'

const app = express()
app.use(bodyParser.json())

// Load environment variables
dotenv.config()

async function startServer() {
  // Initialize a BSV wallet to manage transactions
  // Load the key from a .env file using dotenv
  const serverPrivateKey = process.env.SERVER_PRIVATE_KEY
  if (!serverPrivateKey) {
    console.error('ERROR: SERVER_PRIVATE_KEY not found in .env file')
    process.exit(1)
  }

  const wallet = await Setup.createWalletClientNoEnv({
    chain: 'main',
    rootKeyHex: serverPrivateKey
  })

  // Configure the Auth middleware
  const authMiddleware = createAuthMiddleware({
    wallet,
    allowUnauthenticated: false
  })

  // Enable CORS for frontend-backend communication
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Expose-Headers', '*')
    res.setHeader('Access-Control-Allow-Private-Network', 'true')

    if (req.method === 'OPTIONS') {
      res.status(200).end()
      return
    }
    next()
  })

  // Apply the auth middleware to all routes
  app.use(authMiddleware)

  // Configure a non-protected route
  app.get('/', (req: Request, res: Response) => {
    res.send('Hello, world!')
  })

  // Configure a protected route
  app.get('/protected', (req: Request, res: Response) => {
    const authReq = req as AuthRequest
    if (authReq.auth && authReq.auth.identityKey) {
      res.send(`Hello, authenticated peer with public key: ${authReq.auth.identityKey}`)
    } else {
      res.status(401).send('Unauthorized')
    }
  })

  // Start the server on port 3000
  app.listen(3000, () => {
    console.log('Server is running on port 3000')
  })
}

startServer()
