const { spawn } = require('child_process')
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

// Start backend
const backend = spawn('npm', ['--prefix', 'backend', 'run', 'start'], {
  stdio: 'inherit',
  shell: true
})

// Start frontend
const frontend = spawn('npm', ['--prefix', 'frontend', 'run', 'start'], {
  stdio: 'inherit',
  shell: true
})

// Start LARS (foreground — waits for Docker services)
const lars = spawn('npx', ['lars', 'start'], {
  stdio: 'inherit',
  shell: true
})

// Cleanup all child processes on exit
function cleanup() {
  backend.kill()
  frontend.kill()
  lars.kill()
  process.exit()
}

process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)

lars.on('close', () => {
  backend.kill()
  frontend.kill()
  process.exit()
})
