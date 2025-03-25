FROM oven/bun:1.2.5 as base

WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV HOST=0.0.0.0

# Expose the container port
EXPOSE 3001

# Start the server
CMD ["bun", "start"]