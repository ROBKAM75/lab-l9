const { spawn } = require('child_process')

// Run setup (auto-create .env and lars-config.json)
require('./setup.js')

// Start backend (Express auth server)
const backend = spawn('npm', ['--prefix', 'backend', 'run', 'start'], {
  stdio: 'inherit',
  shell: true
})

// Start LARS (handles frontend + Docker services)
const lars = spawn('npx', ['lars', 'start'], {
  stdio: 'inherit',
  shell: true
})

// Cleanup all child processes on exit
function cleanup() {
  backend.kill()
  lars.kill()
  process.exit()
}

process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)

lars.on('close', () => {
  backend.kill()
  process.exit()
})
