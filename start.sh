#!/bin/bash

# Auto-create .env from .env.example if it doesn't exist
if [ ! -f backend/.env ] && [ -f backend/.env.example ]; then
  cp backend/.env.example backend/.env
  echo "Created backend/.env from .env.example"
fi

npm --prefix backend run start & AUTHSERVER_PID=$!
npm --prefix frontend run start & FRONTEND_PID=$!
trap "kill $AUTHSERVER_PID $FRONTEND_PID" INT TERM EXIT
lars start
