#!/bin/bash

# Create ssl directory if it doesn't exist
mkdir -p .ssl

# Generate RSA private key
openssl genrsa -out .ssl/privkey.pem 2048

# Generate self-signed certificate
openssl req -new -x509 -key .ssl/privkey.pem -out .ssl/fullchain.pem -days 365 -subj "/CN=localhost" -addext "subjectAltName = DNS:localhost,IP:127.0.0.1"

echo "Self-signed SSL certificates generated in .ssl/ directory"
echo "- Private key: .ssl/privkey.pem"
echo "- Certificate: .ssl/fullchain.pem"
echo ""
echo "Add the following to your .env file:"
echo "HTTPS_PORT=3443"
echo "TLS_KEY_PATH=$(pwd)/.ssl/privkey.pem"
echo "TLS_CERT_PATH=$(pwd)/.ssl/fullchain.pem" 