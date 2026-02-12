const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

// Auto-create .env from .env.example if it doesn't exist
const envPath = path.join(__dirname, 'backend', '.env')
const examplePath = path.join(__dirname, 'backend', '.env.example')
if (!fs.existsSync(envPath) && fs.existsSync(examplePath)) {
  fs.copyFileSync(examplePath, envPath)
  console.log('Created backend/.env from .env.example')
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
