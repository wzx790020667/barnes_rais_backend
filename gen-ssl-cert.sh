#!/bin/bash

# Set error handling
set -e

# Check if running with proper permissions
if [ ! -w "$(pwd)" ]; then
    echo "Error: You don't have write permissions in the current directory."
    echo "Try running with sudo: sudo $(basename "$0")"
    exit 1
fi

# Create ssl directory if it doesn't exist
if [ ! -d .ssl ]; then
    mkdir -p .ssl
    chmod 700 .ssl  # Secure permissions - only owner can read, write, execute
fi

# Generate RSA private key
openssl genrsa -out .ssl/privkey.pem 2048
chmod 600 .ssl/privkey.pem  # Secure permissions - only owner can read, write

# Generate self-signed certificate
openssl req -new -x509 -key .ssl/privkey.pem -out .ssl/fullchain.pem -days 365 -subj "/CN=localhost" -addext "subjectAltName = DNS:localhost,IP:127.0.0.1"
chmod 644 .ssl/fullchain.pem  # Owner can read, write; others can read

echo "Self-signed SSL certificates generated in .ssl/ directory"
echo "- Private key: .ssl/privkey.pem"
echo "- Certificate: .ssl/fullchain.pem"