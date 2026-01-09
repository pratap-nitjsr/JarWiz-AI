#!/bin/sh
# Startup script for Render deployment

# Get PORT from environment, default to 8000
PORT=${PORT:-8000}

echo "Starting application on port $PORT..."

# Start uvicorn
exec uvicorn app.main:app --host 0.0.0.0 --port $PORT
