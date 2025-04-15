# Barnes Rais Backend

A HTTP/HTTPS server built with Bun using a modular router structure.

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

## Quick Start for Deployment

This quick start guide helps you set up the project quickly on a Linux Ubuntu server using Docker and Supabase.

For detailed production deployment instructions, please refer to the [Deployment Guide](DEPLOYMENT.md).

## Available Health Check Endpoints

- `/` - Returns a welcome message
- `/api` - Returns a JSON response with server information
- `/health` - Health check endpoint for Docker

## Environment Variables references

The server uses environment variables for configuration. Bun has built-in support for loading `.env` files.

Available environment variables:

| Variable       | Description                  | Default                                                             |
| -------------- | ---------------------------- | ------------------------------------------------------------------- |
| PORT           | HTTP server port number      | 3001                                                                |
| HOST           | Server hostname              | localhost                                                           |
| APP_NAME       | Application name             | Barnes Rais Backend                                                 |
| NODE_ENV       | Environment mode             | development/production                                              |
| HTTPS_PORT     | HTTPS server port number     | 3443                                                                |
| TLS_KEY_PATH   | Path to SSL private key      | -                                                                   |
| TLS_CERT_PATH  | Path to SSL certificate      | -                                                                   |
| TLS_PASSPHRASE | SSL key passphrase (if any)  | -                                                                   |
| SUPABASE_URL   | Supabase URL                 | http://<YOUR_SERVER_IP_ADDRESS>:8000                                |
| SUPABASE_KEY   | Supabase API key             | SERVICE_ROLE_KEY (from .env file of Supabase)                       |
| DATABASE_URL   | PostgreSQL connection string | postgres://postgres:postgres@<YOUR_SERVER_IP_ADDRESS>:8000/postgres |

## Local Development

### 1. Installation

Refer to https://bun.sh/ for Bun installation on your machine.

```bash
# Install dependencies
bun install
```

### 2. Supabse deployment and connection setup

Refer to the [Deployment Guide](DEPLOYMENT.md) for Supabase setup on your local machine. You probably can skip the schema migration step, but you still need to do the buckets setup manually.

### 3. Migrate Database Schema

Run database migrations to set up the schema:

```bash
bun run schema:push
```

### 4. Start the Application

```bash
bun run dev
```

The server will start on port 3001 (or the port specified in .env). Access it at http://localhost:3001

This project was created using `bun init` in bun v1.2.5. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.

## HTTPS Configuration

The server supports HTTPS connections. To enable HTTPS:

1. Generate SSL certificates:

   ```bash
   # For development (self-signed certificates)
   ./scripts/generate-ssl-cert.sh

   # For production, use a proper certificate authority like Let's Encrypt
   ```

2. Configure your `.env` file with the paths to your SSL certificates:

   ```
   HTTPS_PORT=3443
   TLS_KEY_PATH=/path/to/your/privkey.pem
   TLS_CERT_PATH=/path/to/your/fullchain.pem
   TLS_PASSPHRASE=your_passphrase_if_needed  # Only if your key is encrypted
   ```

3. Start the server as usual. It will automatically detect the SSL certificates and start both HTTP and HTTPS servers.

4. Access the HTTPS server at https://localhost:3443 (or the HTTPS_PORT you configured)

For production environments, it's recommended to use proper certificates from a trusted certificate authority like Let's Encrypt.
