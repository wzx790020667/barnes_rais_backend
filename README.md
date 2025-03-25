# ard-server

A simple HTTP server built with Bun using a modular router structure.

## Project Structure

```
├── src/
│   ├── index.ts            # Server entry point
│   ├── config/             # Configuration files
│   ├── db/                 # Database related files
│   ├── domains/            # Business logic domains
│   ├── lib/                # Library code
│   ├── middlewares/        # Express middleware functions
│   └── utils/              # Utility functions
├── drizzle/                # Database migration files
├── supabase/               # Supabase configuration
├── docker-compose.yml      # Docker setup
├── Dockerfile              # Docker image definition
└── setup-docker.sh         # Docker deployment script
```

## Quick Start

This quick start guide helps you set up the project quickly on a Linux Ubuntu server using Docker and Supabase.

### 1. Install Bun (for Linux)

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Source your profile to use Bun immediately (or restart your terminal)
source ~/.bashrc

# Set alias for convient access temporarily
alias bunx=~/.bun/bin/bunx
alias bun=~/.bun/bin/bun

# Verify installation
bun --version
```

### 2. Install Supabase CLI

```bash
# Install Supabase CLI using Bun
bunx supabase --version
```

### 3. Start Supabase container locally

```bash
# Start Supabase using Bun
bunx supabase start
```

After running these commands, you can proceed with Docker deployment:

```bash
# Build and start the Docker containers
docker compose build
docker compose up -d
```

This will:

1. Build the application Docker image
2. Start all services defined in docker-compose.yml
3. Run database migrations automatically
4. Start the application server

You can check the application logs with:

```bash
docker compose logs -f
```

## Deployment

For detailed production deployment instructions, please refer to the [Deployment Guide](DEPLOYMENT.md).

## Available Endpoints

- `/` - Returns a welcome message
- `/api` - Returns a JSON response with server information
- `/health` - Health check endpoint for Docker

## Environment Variables

The server uses environment variables for configuration. Bun has built-in support for loading `.env` files.

Copy `.env.example` to `.env` and modify as needed:

```bash
cp .env.example .env
```

Available environment variables:

| Variable     | Description                  | Default                                               |
| ------------ | ---------------------------- | ----------------------------------------------------- |
| PORT         | Server port number           | 3001                                                  |
| HOST         | Server hostname              | localhost                                             |
| APP_NAME     | Application name             | ARD Server                                            |
| NODE_ENV     | Environment mode             | development                                           |
| SUPABASE_URL | Supabase URL                 | http://127.0.0.1:54321                                |
| SUPABASE_KEY | Supabase API key             | (service_role_key)                                    |
| DATABASE_URL | PostgreSQL connection string | postgres://postgres:postgres@127.0.0.1:54322/postgres |

## Installation

To install dependencies:

```bash
bun install
```

## Local Development

### 1. Start Supabase

Start a local Supabase instance:

```bash
bunx supabase start
```

This will download Docker images for Supabase and start a local instance. Connection details will be displayed and saved to `supabase/connection.txt`.

### 2. Setup Database Schema

Run database migrations to set up the schema:

```bash
bun run schema:push
```

### 3. Start the Application

```bash
bun run dev
```

The server will start on port 3001 (or the port specified in .env). Access it at http://localhost:3001

## Docker Setup

You can run the entire application stack using Docker, which will handle:

1. Starting Supabase
2. Running database migrations
3. Starting the application server

```bash
# Build and start everything
docker compose up -d
```

Or use the provided script which also saves the Docker image:

```bash
./setup-docker.sh
```

This setup follows the same sequence as the local development workflow:

1. The `supabase` service starts first
2. Once Supabase is ready, the `db-migration` service runs to set up the schema
3. Finally, the main `app` service starts

This project was created using `bun init` in bun v1.2.2. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
