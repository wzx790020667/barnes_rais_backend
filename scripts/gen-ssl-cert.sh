#!/bin/bash

# Set error handling
set -e

# Save the current working directory
CURRENT_DIR="$(pwd)"

# Check if running with proper permissions
if [ ! -w "$CURRENT_DIR" ]; then
    echo "Error: You don't have write permissions in the current directory."
    echo "Try running with sudo: sudo $(basename "$0")"
    exit 1
fi

# Create ssl directory if it doesn't exist
if [ ! -d "$CURRENT_DIR/.ssl" ]; then
    mkdir -p "$CURRENT_DIR/.ssl"
    chmod 700 "$CURRENT_DIR/.ssl"  # Secure permissions - only owner can read, write, execute
fi

# Generate RSA private key
openssl genrsa -out "$CURRENT_DIR/.ssl/privkey.pem" 2048
chmod 600 "$CURRENT_DIR/.ssl/privkey.pem"  # Secure permissions - only owner can read, write

# Generate self-signed certificate
openssl req -new -x509 -key "$CURRENT_DIR/.ssl/privkey.pem" -out "$CURRENT_DIR/.ssl/fullchain.pem" -days 365 -subj "/CN=localhost" -addext "subjectAltName = DNS:localhost,IP:127.0.0.1"
chmod 644 "$CURRENT_DIR/.ssl/fullchain.pem"  # Owner can read, write; others can read

# If running with sudo, ensure the real user owns the files
if [ -n "$SUDO_USER" ]; then
    chown -R "$SUDO_USER" "$CURRENT_DIR/.ssl"
    echo "Changed ownership of .ssl directory to $SUDO_USER"
fi

echo "Self-signed SSL certificates generated in $CURRENT_DIR/.ssl/ directory"
echo "- Private key: $CURRENT_DIR/.ssl/privkey.pem"
echo "- Certificate: $CURRENT_DIR/.ssl/fullchain.pem"