#!/bin/bash

echo "Starting Transcendence - Multiplayer Pong Tournament"
echo "=========================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Start the application
echo "Building and starting containers..."
docker-compose up --build

echo "Application is running!"
echo "Frontend: http://localhost"
echo "Backend API: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop the application"