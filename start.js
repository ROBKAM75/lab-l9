const { spawn } = require('child_process')
const net = require('net')

// Run setup (auto-create .env and lars-config.json)
require('./setup.js')

// Check if a port is available
function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.once('error', () => resolve(false))
    server.once('listening', () => { server.close(); resolve(true) })
    server.listen(port)
  })
}

async function main() {
  // Check critical ports before starting
  const ports = [3000, 8080]
  for (const port of ports) {
    const available = await checkPort(port)
    if (!available) {
      console.error(`ERROR: Port ${port} is already in use.`)
      console.error('Run this to free all ports:')
      console.error('  taskkill /F /IM node.exe   (Windows)')
      console.error('  docker ps -aq | xargs docker stop   (Docker)')
      process.exit(1)
    }
  }
  console.log('Ports 3000 and 8080 are available.')

  // Start backend (Express auth server on port 3000)
  const backend = spawn('npm', ['--prefix', 'backend', 'run', 'start'], {
    stdio: 'inherit',
    shell: true
  })

  // Start LARS (handles frontend + Docker services on port 8080)
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
}

main()
