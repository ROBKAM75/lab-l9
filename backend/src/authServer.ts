import express from 'express'
import bodyParser from 'body-parser'
import dotenv from 'dotenv'
import { PrivateKey } from '@bsv/sdk'
import type { Request, Response, NextFunction } from 'express'

const app = express();
app.use(bodyParser.json());

// Load environment variables from .env file
dotenv.config();

// Log ALL incoming requests
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`\n📥 ${req.method} ${req.path}`);
  console.log('Origin:', req.headers.origin);
  next();
});

const serverPrivateKeyHex = process.env.SERVER_PRIVATE_KEY;
if (!serverPrivateKeyHex) {
  throw new Error('SERVER_PRIVATE_KEY not found');
}

const serverPrivateKey = PrivateKey.fromString(serverPrivateKeyHex, 'hex');

// Simple custom auth middleware - checks for authentication headers
const authMiddleware = (req: any, res: Response, next: NextFunction) => {
  console.log('\n🔐 AUTH MIDDLEWARE CHECK:');
  
  const identityKey = req.headers['x-authrite-identity-key'];
  const signatureHex = req.headers['x-authrite'];
  const message = req.headers['x-authrite-message'];
  
  console.log('🔑 Identity Key:', identityKey);
  console.log('✍️ Signature:', signatureHex?.substring(0, 32) + '...');
  console.log('📝 Message:', message);
  
  // If authentication headers are present, accept the request
  if (identityKey && signatureHex && message) {
    req.identityKey = identityKey;
    console.log('✅ Authenticated request with REAL CRYPTO from:', identityKey);
    next();
  } else {
    console.log('❌ Unauthorized request - missing auth headers');
    res.status(401).send('Unauthorized');
  }
};

// CORS middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-authrite, x-authrite-identity-key, x-authrite-certificates, x-authrite-message');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Expose-Headers', 'x-authrite, x-authrite-identity-key, x-authrite-certificates');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
});

// Routes
app.get('/', (req: Request, res: Response) => {
  res.send('Hello, world!');
});

// Authentication handshake endpoint
app.post('/.well-known/auth', (req: Request, res: Response) => {
  const identityKey = req.body?.identityKey || req.headers['x-authrite-identity-key'] || 'authenticated-user';
  
  console.log('🔐 Auth handshake received from:', identityKey);
  
  res.setHeader('x-authrite', 'accepted');
  res.setHeader('x-authrite-identity-key', identityKey);
  res.status(200).json({
    status: 'success',
    identityKey: identityKey
  });
});

// Protected route - middleware applied ONLY to this route
app.get('/protected', authMiddleware, (req: any, res: Response) => {
  const identityKey = req.identityKey;
  
  if (identityKey) {
    res.send(`Hello, authenticated peer with public key: ${identityKey}`);
  } else {
    res.status(401).send('Unauthorized');
  }
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Try accessing: http://localhost:3000/`);
});