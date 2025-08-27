FROM node:20-alpine

# Install pnpm globally
RUN npm install -g pnpm

WORKDIR /app

# Copy all files
COPY . /app

# Install dependencies using pnpm
RUN pnpm install

# Expose Vite dev server port
EXPOSE 5173

# Default command (can be overridden by docker-compose)
CMD ["pnpm", "run", "dev"]