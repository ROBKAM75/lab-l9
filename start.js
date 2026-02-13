const { spawn, spawnSync, execSync } = require('child_process')
const net = require('net')
const path = require('path')

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

// Wait until a port is occupied (service is up)
function waitForPort(port, timeoutMs) {
  return new Promise((resolve) => {
    const start = Date.now()
    const check = () => {
      const socket = new net.Socket()
      socket.once('connect', () => { socket.destroy(); resolve(true) })
      socket.once('error', () => {
        if (Date.now() - start > timeoutMs) return resolve(false)
        setTimeout(check, 500)
      })
      socket.connect(port, '127.0.0.1')
    }
    check()
  })
}

// Kill whatever is using a port (node, Docker, anything)
function freePort(port) {
  try {
    const ids = execSync('docker ps -aq', { encoding: 'utf8' }).trim()
    if (ids) {
      console.log('  Stopping Docker containers...')
      execSync('docker kill ' + ids.split('\n').join(' '), { stdio: 'ignore' })
      execSync('docker rm ' + ids.split('\n').join(' '), { stdio: 'ignore' })
    }
  } catch (e) {}
  // Kill the specific process on the port
  try {
    if (process.platform === 'win32') {
      const output = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, { encoding: 'utf8' })
      for (const line of output.trim().split('\n')) {
        const pid = line.trim().split(/\s+/).pop()
        if (pid && pid !== '0') {
          execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' })
        }
      }
    } else {
      // Mac/Linux
      const output = execSync(`lsof -ti :${port}`, { encoding: 'utf8' })
      for (const pid of output.trim().split('\n')) {
        if (pid) execSync(`kill -9 ${pid}`, { stdio: 'ignore' })
      }
    }
  } catch (e) {}
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

  // Step 1: Compile backend synchronously
  console.log('Compiling backend...')
  const tsc = spawnSync('npx', ['tsc'], {
    cwd: path.join(__dirname, 'backend'),
    stdio: 'inherit',
    shell: true
  })
  if (tsc.status !== 0) {
    console.error('Backend compilation failed.')
    process.exit(1)
  }

  // Step 2: Start backend server (non-blocking)
  console.log('Starting backend server...')
  const backend = spawn('node', ['dist/src/authServer.js'], {
    cwd: path.join(__dirname, 'backend'),
    stdio: ['ignore', 'inherit', 'inherit'],
    shell: true
  })

  // Step 3: Wait for backend to be ready on port 3000
  const ready = await waitForPort(3000, 15000)
  if (!ready) {
    console.error('ERROR: Backend failed to start on port 3000.')
    backend.kill()
    process.exit(1)
  }
  console.log('Backend is running on port 3000.\n')

  // Step 4: Run LARS in foreground (blocking — full terminal for interactive prompts)
  spawnSync('npx', ['lars', 'start'], {
    stdio: 'inherit',
    shell: true
  })

  // LARS exited — clean up backend
  console.log('\nLARS stopped. Cleaning up...')
  backend.kill()
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /F /T /PID ${backend.pid}`, { stdio: 'ignore' })
    }
  } catch (e) {}
}

main()
