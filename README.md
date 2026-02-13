# Lab L-9: User Authentication with BRC-103

A blockchain-authenticated web app using BSV wallet identity. The frontend sends authenticated requests via AuthFetch, and the backend verifies them using BRC-103 middleware.

## Quick Start

```
npm install
npm run start
```

That's it. This single command:
1. Auto-creates `backend/.env` and LARS config (if missing)
2. Checks that ports 3000 and 8080 are available
3. Starts the Express auth server (port 3000)
4. Starts LARS with frontend dev server and Docker overlay (port 8080)

Open **http://localhost:8080** in your browser.

## How It Works

- **Frontend** (React + Vite): Presents a button that sends an authenticated request using `AuthFetch` from `@bsv/sdk`
- **Backend** (Express + TypeScript): Validates the BRC-103 auth headers and responds with the authenticated identity
- **LARS**: Runs Docker services, proxies the frontend, and provides the wallet overlay at port 8080

## Project Structure

```
lab-l9/
  backend/           Express auth server (TypeScript)
    src/authServer.ts   Main server code
    .env.example        Template for environment variables
  frontend/          React frontend (Vite)
    src/App.tsx         Main app with AuthFetch call
  setup.js           Auto-creates .env and LARS config
  start.js           Starts backend + LARS (with port checks)
  deployment-info.json  LARS configuration
```

## Requirements

- Node.js 18+
- Docker Desktop (running)
- A BSV wallet (MetaLens or compatible) for authentication
