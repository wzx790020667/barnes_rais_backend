FROM oven/bun:1.2.2 as base

WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Set environment variables
ENV NODE_ENV=production

# Expose the port
EXPOSE 3001

# Start the server
CMD ["bun", "start"] 