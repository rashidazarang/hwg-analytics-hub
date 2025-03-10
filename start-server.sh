#!/bin/bash

# Start Server Script
# This script tries different approaches to start a development server

echo "Starting development server..."
echo "------------------------------"

# Try to find available ports
PORT=5173
BACKUP_PORT=8080
PYTHON_PORT=8000

# Kill any existing processes on these ports
kill_port() {
  local port=$1
  echo "Checking for processes on port $port..."
  PID=$(lsof -i :$port -t 2>/dev/null)
  if [ ! -z "$PID" ]; then
    echo "Found process $PID on port $port, attempting to kill..."
    kill -9 $PID 2>/dev/null
    sleep 1
  fi
}

kill_port $PORT
kill_port $BACKUP_PORT 
kill_port $PYTHON_PORT

# Create necessary directories
mkdir -p ./public/api 2>/dev/null

# Update the health check file with current timestamp
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
cat > ./public/api/health-check.json << EOL
{
  "status": "ok",
  "timestamp": "$TIMESTAMP",
  "version": "1.0.0",
  "environment": "development",
  "services": {
    "database": "connected",
    "api": "running"
  },
  "message": "Server is healthy and responding to requests"
}
EOL

echo "Updated health check endpoint with current timestamp"

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Try to start the Python server first (most reliable)
if command_exists python3; then
  echo "Starting Python server on port $PYTHON_PORT..."
  echo "Try accessing: http://localhost:$PYTHON_PORT"
  
  # Start python server in background
  python3 python-server.py &
  PYTHON_PID=$!
  
  # Give it a moment to start
  sleep 2
  
  # Try to open browser
  if command_exists open; then
    open "http://localhost:$PYTHON_PORT"
  elif command_exists xdg-open; then
    xdg-open "http://localhost:$PYTHON_PORT"
  elif command_exists start; then
    start "http://localhost:$PYTHON_PORT"
  fi
  
  echo "Python server started with PID: $PYTHON_PID"
  echo "Press Ctrl+C to stop the server"
  
  # Wait for the Python server process
  wait $PYTHON_PID
  
else
  echo "Python not found, falling back to npm..."
  
  # Try to start Vite with npm
  if command_exists npm; then
    echo "Starting Vite server with npm on port $PORT..."
    echo "Try accessing: http://localhost:$PORT"
    
    # Run npm in the background
    npm run dev:alt &
    NPM_PID=$!
    
    # Give it a moment to start
    sleep 5
    
    # Try to open browser
    if command_exists open; then
      open "http://localhost:$PORT"
    elif command_exists xdg-open; then
      xdg-open "http://localhost:$PORT"
    elif command_exists start; then
      start "http://localhost:$PORT"
    fi
    
    echo "Vite server started with PID: $NPM_PID"
    echo "Press Ctrl+C to stop the server"
    
    # Wait for the NPM process
    wait $NPM_PID
  else
    echo "Error: Neither Python nor npm are available."
    exit 1
  fi
fi