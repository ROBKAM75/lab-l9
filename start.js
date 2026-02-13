const { spawn, spawnSync, execSync } = require('child_process')
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

// Kill whatever is using a port (node, Docker, anything)
function freePort(port) {
  // Try killing Docker containers first
  try {
    const ids = execSync('docker ps -aq', { encoding: 'utf8' }).trim()
    if (ids) {
      console.log('  Stopping Docker containers...')
      execSync('docker kill ' + ids.split('\n').join(' '), { stdio: 'ignore' })
      execSync('docker rm ' + ids.split('\n').join(' '), { stdio: 'ignore' })
    }
  } catch (e) {}

  // Then try killing the specific process on the port (Windows)
  if (process.platform === 'win32') {
    try {
      const output = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, { encoding: 'utf8' })
      for (const line of output.trim().split('\n')) {
        const pid = line.trim().split(/\s+/).pop()
        if (pid && pid !== '0') {
          execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' })
        }
      }
    } catch (e) {}
  }
}

async function main() {
  // Check and free critical ports
  const ports = [3000, 8080]
  for (const port of ports) {
    let available = await checkPort(port)
    if (!available) {
      console.log(`Port ${port} is in use. Cleaning up...`)
      freePort(port)
      await new Promise(r => setTimeout(r, 1000))
      available = await checkPort(port)
      if (!available) {
        console.error(`ERROR: Port ${port} is still in use.`)
        console.error(`  netstat -ano | findstr :${port}`)
        process.exit(1)
      }
    }
  }
  console.log('Ports 3000 and 8080 are available.\n')

  // Start backend in background (detached, no stdin, cwd=backend/)
  const path = require('path')
  const backend = spawn('npm', ['run', 'start'], {
    cwd: path.join(__dirname, 'backend'),
    stdio: ['ignore', 'inherit', 'inherit'],
    shell: true,
    detached: true
  })
  backend.unref()

  // Run LARS in foreground (blocking — full terminal control for interactive prompts)
  spawnSync('npx', ['lars', 'start'], {
    stdio: 'inherit',
    shell: true
  })

  // LARS exited — clean up backend
  console.log('\nLARS stopped. Cleaning up...')
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /F /T /PID ${backend.pid}`, { stdio: 'ignore' })
    } else {
      process.kill(-backend.pid)
    }
  } catch (e) {}
}

main()
