FROM node:18-alpine

RUN apk add --no-cache openssl

WORKDIR /app

# Install dependencies first (for caching)
COPY package.json package-lock.json* ./
RUN npm install

# Copy Prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3000

# Start command (Run db migrations, then start server)
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
