# Deployment Guide

This document outlines the steps needed to deploy the ARD Server.

## Prerequisites

- Git
- Docker and Docker Compose
- Access to server where you want to deploy

## Deployment Steps

### 1. Install Bun

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Source your profile to use Bun immediately (or restart your terminal)
source ~/.bashrc

# Set alias for convenient access temporarily
alias bunx=~/.bun/bin/bunx
alias bun=~/.bun/bin/bun

# Verify installation
bun --version
```

### 2. Clone the Repository

```bash
git clone https://github.com/yourusername/barnes_rais_backend.git
cd barnes_rais_backend
```

### 3. Navigate to Docker Directory

```bash
cd docker
```

### 4. Set Up Environment Variables

```bash
cp .env.example .env
```

### 5. Update Environment Variables

Edit the `.env` file and update with your database credentials:

```bash
# Update these values with your actual database credentials
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
DATABASE_URL=your_database_url
```

You can obtain the database credentials by running:

```bash
bunx supabase status
```

This command will display connection information including URLs, API keys, and database connection strings that you can use to update your `.env` file.

> **Important Note:** When you run `bunx supabase start` for the first time, a `supabase` folder will be generated in your current working directory. If you need to restart Supabase instances later, you must run the command from the location where this `supabase` folder exists. Always navigate to the project root directory before running Supabase commands.

### 6. Run Database Migration (First-time Deployment)

```bash
docker compose -f migrate.yml --env-file .env up
```

### 7. Start the Server

```bash
docker compose -f start.yml --env-file .env up --build -d
```

## Maintenance

For subsequent deployments (when the database schema already exists), you can skip step 6 and only run step 7.

## Troubleshooting

If you encounter any issues during deployment:

1. Check Docker logs: `docker compose -f start.yml logs`
2. Verify environment variables are correctly set
3. Ensure database is accessible from the deployment server
