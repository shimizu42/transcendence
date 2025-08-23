#!/bin/bash

echo "Starting Transcendence - Development Mode"
echo "========================================"

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

# Start the application in development mode
echo "Building and starting containers in development mode..."
docker-compose -f docker-compose.dev.yml up --build

echo "Development application is running!"
echo "Frontend: http://localhost:8080"
echo "Backend API: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop the application"