/**
 * Lab L-9: Authentication Server
 *
 * This Express server demonstrates blockchain-based authentication.
 * It verifies cryptographic signatures from client wallets to authenticate users
 * without passwords - identity is proven mathematically!
 */

import express, { Request, Response, NextFunction, RequestHandler } from 'express'
import bodyParser from 'body-parser'
import dotenv from 'dotenv'
import { PrivateKey, ProtoWallet } from '@bsv/sdk'

// Load environment variables
dotenv.config()

// Verify server private key exists
const serverPrivateKeyHex = process.env.SERVER_PRIVATE_KEY
if (!serverPrivateKeyHex) {
  console.error('ERROR: SERVER_PRIVATE_KEY not found in .env file')
  process.exit(1)
}

// Create Express app
const app = express()
app.use(bodyParser.json())

/**
 * CORS Middleware
 * Allows cross-origin requests from the frontend (different port)
 */
const corsMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Expose-Headers', '*')
  res.setHeader('Access-Control-Allow-Private-Network', 'true')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }
  next()
}

app.use(corsMiddleware)

/**
 * Initialize server and define routes
 */
async function startServer() {
  try {
    // Create server's wallet (used for its own identity, not for verification)
    const serverPrivateKey = PrivateKey.fromString(serverPrivateKeyHex!, 'hex')
    const serverWallet = new ProtoWallet(serverPrivateKey)
    console.log('Server wallet initialized')

    /**
     * Public Route - No authentication required
     * Used for health checks and testing connectivity
     */
    app.get('/', (req: Request, res: Response) => {
      res.send('Hello, world!')
    })

    /**
     * Protected Route - Requires cryptographic authentication
     *
     * Expected headers:
     * - x-bsv-auth-identity-key: Client's public key (hex)
     * - x-bsv-auth-signature: Signature of the message (hex)
     * - x-bsv-auth-message: Original message (base64)
     * - x-bsv-auth-timestamp: Request timestamp (for replay protection)
     */
    app.get('/protected', async (req: Request, res: Response) => {
      // Extract authentication headers
      const identityKey = req.headers['x-bsv-auth-identity-key'] as string
      const signatureHex = req.headers['x-bsv-auth-signature'] as string
      const messageB64 = req.headers['x-bsv-auth-message'] as string
      const timestamp = req.headers['x-bsv-auth-timestamp'] as string
      const keyID = req.headers['x-bsv-auth-key-id'] as string || '1'

      // Check if all required headers are present
      if (!identityKey || !signatureHex || !messageB64) {
        res.status(401).send('Unauthorized - missing authentication headers')
        return
      }

      try {
        // Decode the message from base64
        const message = Buffer.from(messageB64, 'base64').toString('utf8')

        // Verify timestamp (prevent replay attacks - 5 minute window)
        if (timestamp) {
          const requestTime = parseInt(timestamp)
          const now = Date.now()
          const fiveMinutes = 5 * 60 * 1000
          if (Math.abs(now - requestTime) > fiveMinutes) {
            res.status(401).send('Unauthorized - request expired')
            return
          }
        }

        // Verify the signature using ProtoWallet('anyone')
        // This can verify signatures made with counterparty='anyone'
        const messageBytes = Array.from(Buffer.from(message, 'utf8'))
        const signatureBytes = Array.from(Buffer.from(signatureHex, 'hex'))
        const verifyWallet = new ProtoWallet('anyone')

        const verifyResult = await verifyWallet.verifySignature({
          data: messageBytes,
          signature: signatureBytes,
          protocolID: [2, 'lab L9 auth'],
          keyID: keyID,
          counterparty: identityKey,
          forSelf: false
        })

        if (verifyResult.valid) {
          // Signature verified! User is authenticated
          res.send(`Hello, authenticated peer with public key: ${identityKey}`)
        } else {
          res.status(401).send('Unauthorized - invalid signature')
        }

      } catch (err: any) {
        console.error('Authentication error:', err.message)
        res.status(401).send('Unauthorized - verification failed')
      }
    })

    // Start the server
    const PORT = 3000
    app.listen(PORT, () => {
      console.log('========================================')
      console.log(`Lab L-9 Auth Server running on port ${PORT}`)
      console.log('========================================')
      console.log(`Public route:    http://localhost:${PORT}/`)
      console.log(`Protected route: http://localhost:${PORT}/protected`)
      console.log('========================================')
    })

  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer()
