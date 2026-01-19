#!/bin/bash

# DJ Loop Startup Script
# Starts the dashboard and opens browser automatically

cd /Users/dannyjonesphotography/Desktop/DJ-Projects/dj-loop/apps/dashboard

# Start the dev server in background
npm run dev &
SERVER_PID=$!

# Wait for server to be ready (check every second, max 30 seconds)
echo "Starting DJ Loop..."
for i in {1..30}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo "DJ Loop is ready!"
        open http://localhost:3000
        break
    fi
    sleep 1
done

# Keep script running to maintain the server
wait $SERVER_PID
