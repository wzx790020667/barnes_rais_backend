#!/bin/bash

# Make script executable
chmod +x setup-docker.sh

# Fetch Supabase credentials
echo "Fetching Supabase credentials..."
bunx supabase status

# Build and start the Docker containers
echo "Building and starting Docker containers..."
docker compose build
docker compose up -d

echo "Deployment complete! Your application is now running."
echo "You can check the logs with: docker compose logs -f" 