const fs = require('fs')
const path = require('path')

// Read server private key from .env.example
const examplePath = path.join(__dirname, 'backend', '.env.example')
let serverKey = null
if (fs.existsSync(examplePath)) {
  const content = fs.readFileSync(examplePath, 'utf8')
  const match = content.match(/SERVER_PRIVATE_KEY=(\w+)/)
  if (match) serverKey = match[1]
}

// Auto-create backend/.env from .env.example if it doesn't exist
const envPath = path.join(__dirname, 'backend', '.env')
if (!fs.existsSync(envPath) && fs.existsSync(examplePath)) {
  fs.copyFileSync(examplePath, envPath)
  console.log('Created backend/.env from .env.example')
}

// Auto-create LARS config with server key so it doesn't prompt
const larsConfigDir = path.join(__dirname, 'local-data')
const larsConfigPath = path.join(larsConfigDir, 'lars-config.json')
if (!fs.existsSync(larsConfigPath) && serverKey) {
  if (!fs.existsSync(larsConfigDir)) {
    fs.mkdirSync(larsConfigDir, { recursive: true })
  }
  const larsConfig = {
    projectKeys: {
      mainnet: { serverPrivateKey: serverKey, arcApiKey: null },
      testnet: { serverPrivateKey: serverKey, arcApiKey: null }
    }
  }
  fs.writeFileSync(larsConfigPath, JSON.stringify(larsConfig, null, 2))
  console.log('Created local-data/lars-config.json with server key')
}
