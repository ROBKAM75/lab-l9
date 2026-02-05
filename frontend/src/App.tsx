/**
 * Lab L-9: User Authentication in a Blockchain Application
 *
 * This React app demonstrates blockchain-based authentication using the BSV SDK.
 * The user's wallet (Metanet Client) signs requests, and the backend verifies
 * the signature cryptographically - no passwords needed!
 */

import React, { useState } from 'react'
import { Button, Typography, Container, CircularProgress, Paper, Box } from '@mui/material'
import { WalletClient } from '@bsv/sdk'

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [response, setResponse] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  /**
   * Sends an authenticated request to the backend.
   *
   * Flow:
   * 1. Connect to wallet (Metanet Client)
   * 2. Get user's identity key (public key)
   * 3. Create a message with request details
   * 4. Sign the message (wallet will ask for permission)
   * 5. Send request with identity + signature to backend
   * 6. Backend verifies signature and responds
   */
  const handleAuthenticate = async () => {
    setIsLoading(true)
    setResponse(null)
    setError(null)

    try {
      // Step 1: Connect to Metanet Client
      const wallet = new WalletClient()

      // Step 2: Get user's identity key (public key)
      const { publicKey } = await wallet.getPublicKey({ identityKey: true })
      if (!publicKey) {
        throw new Error('Could not get identity key from wallet')
      }

      // Step 3: Create message to sign (includes request details for security)
      const timestamp = Date.now()
      const requestData = {
        method: 'GET',
        url: 'http://localhost:3000/protected',
        timestamp: timestamp,
        nonce: Math.random().toString(36).substring(2)
      }
      const messageToSign = JSON.stringify(requestData)

      // Step 4: Sign the message (Metanet Client will ask for permission)
      // Using security level 2 and unique keyID to ensure wallet prompts for approval
      const messageBytes = new TextEncoder().encode(messageToSign)
      const uniqueKeyID = `auth-${Date.now()}`
      const signResult = await wallet.createSignature({
        data: Array.from(messageBytes),
        protocolID: [2, 'lab L9 auth'],
        keyID: uniqueKeyID,
        counterparty: 'anyone'
      })

      if (!signResult.signature) {
        throw new Error('Failed to sign message')
      }

      // Convert signature to hex string
      const signatureHex = Array.from(signResult.signature)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')

      // Step 5: Send authenticated request to backend
      const res = await fetch('http://localhost:3000/protected', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-bsv-auth-identity-key': publicKey,
          'x-bsv-auth-signature': signatureHex,
          'x-bsv-auth-message': btoa(messageToSign),
          'x-bsv-auth-timestamp': timestamp.toString(),
          'x-bsv-auth-key-id': uniqueKeyID
        }
      })

      // Step 6: Handle response
      const text = await res.text()

      if (res.ok) {
        setResponse(text)
      } else {
        setError(`Authentication failed: ${text}`)
      }

    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Lab L-9: User Authentication
          </Typography>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Authenticate using your blockchain wallet. No password required -
            your identity is verified cryptographically!
          </Typography>

          <Button
            variant="contained"
            color="primary"
            onClick={handleAuthenticate}
            disabled={isLoading}
            fullWidth
            size="large"
            sx={{ mb: 2 }}
          >
            {isLoading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Authenticate with Wallet'
            )}
          </Button>

          {response && (
            <Paper
              variant="outlined"
              sx={{ p: 2, mt: 2, backgroundColor: '#1b5e20', border: '2px solid #4caf50' }}
            >
              <Typography variant="body1" sx={{ wordBreak: 'break-all', color: '#ffffff' }}>
                <strong>Success!</strong><br />
                {response}
              </Typography>
            </Paper>
          )}

          {error && (
            <Paper
              variant="outlined"
              sx={{ p: 2, mt: 2, backgroundColor: '#b71c1c', border: '2px solid #f44336' }}
            >
              <Typography variant="body1" sx={{ color: '#ffffff' }}>
                <strong>Error:</strong> {error}
              </Typography>
            </Paper>
          )}
        </Paper>

        <Paper elevation={1} sx={{ p: 2, mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            How it works:
          </Typography>
          <Typography variant="body2" color="text.secondary">
            1. Your wallet (Metanet Client) provides your public identity key<br />
            2. The app asks your wallet to sign a message (you must approve)<br />
            3. The signature proves you own the private key<br />
            4. The backend verifies the signature cryptographically<br />
            5. No passwords, no sessions - just math!
          </Typography>
        </Paper>
      </Box>
    </Container>
  )
}

export default App
