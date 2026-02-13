const { spawn, execSync } = require('child_process')
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

// Stop and remove all Docker containers
function cleanDocker() {
  try {
    const ids = execSync('docker ps -aq', { encoding: 'utf8' }).trim()
    if (ids) {
      console.log('Stopping old Docker containers...')
      execSync('docker kill ' + ids.split('\n').join(' '), { stdio: 'ignore' })
      execSync('docker rm ' + ids.split('\n').join(' '), { stdio: 'ignore' })
      console.log('Old containers removed.')
    }
  } catch (e) {
    // Docker not running or no containers — that's fine
  }
}

async function main() {
  // Check critical ports, auto-clean Docker if blocked
  const ports = [3000, 8080]
  for (const port of ports) {
    const available = await checkPort(port)
    if (!available) {
      console.log(`Port ${port} is in use. Cleaning up Docker containers...`)
      cleanDocker()
      // Check again after cleanup
      const retry = await checkPort(port)
      if (!retry) {
        console.error(`ERROR: Port ${port} is still in use after cleanup.`)
        console.error('Something else is using this port. Check with:')
        console.error(`  netstat -ano | findstr :${port}`)
        process.exit(1)
      }
    }
  }
  console.log('Ports 3000 and 8080 are available.')

  // Start backend (no stdin — it doesn't need interactive input)
  const backend = spawn('npm', ['--prefix', 'backend', 'run', 'start'], {
    stdio: ['ignore', 'inherit', 'inherit'],
    shell: true
  })

  // Start LARS with full stdin (needs it for interactive prompts like funding)
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
