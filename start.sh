#!/bin/bash
npm --prefix backend run start & AUTHSERVER_PID=$!
npm --prefix frontend run start & FRONTEND_PID=$!
trap "kill $AUTHSERVER_PID $FRONTEND_PID" INT TERM EXIT
lars start
