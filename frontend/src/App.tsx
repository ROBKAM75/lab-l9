import React, { useState } from 'react'
import { Button, Typography, Container, CircularProgress } from '@mui/material'
import { WalletClient, AuthFetch } from '@bsv/sdk'

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [response, setResponse] = useState<string | null>(null)

  const handleButtonClick = async () => {
    setIsLoading(true)
    setResponse(null)

    try {
      const wallet = new WalletClient()
      const authFetch = new AuthFetch(wallet)

      const res = await authFetch.fetch('http://localhost:3000/protected', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!res.ok) {
        throw new Error(`Server responded with status ${res.status}`)
      }

      const text = await res.text()
      setResponse(text)
    } catch (err: any) {
      setResponse(`Error: ${err.message || err}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Container maxWidth="sm">
      <Typography variant="h4" component="h1" gutterBottom>
        User Authentication App
      </Typography>
      <Button
        variant="contained"
        color="primary"
        onClick={handleButtonClick}
        disabled={isLoading}
      >
        {isLoading ? <CircularProgress size={24} /> : 'Send Request to Backend'}
      </Button>
      {response && (
        <Typography
          variant="body1"
          style={{ marginTop: '20px', whiteSpace: 'pre-wrap' }}
        >
          Response from backend: {response}
        </Typography>
      )}
    </Container>
  )
}

export default App
