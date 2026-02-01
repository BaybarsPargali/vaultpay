# VaultPay Production Dockerfile
# Includes Solana CLI tools for Token-2022 Confidential Transfers

# ============================================================================
# Stage 1: Dependencies
# ============================================================================
FROM node:20-slim AS deps

WORKDIR /app

# Install dependencies required for native modules
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json package-lock.json ./
COPY patches ./patches

# Install dependencies
RUN npm ci --legacy-peer-deps

# ============================================================================
# Stage 2: Builder
# ============================================================================
FROM node:20-slim AS builder

WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js application
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build the application
RUN npm run build

# ============================================================================
# Stage 3: Solana CLI (for spl-token)
# ============================================================================
FROM rust:1.75-slim AS solana-builder

# Install Solana CLI tools
RUN apt-get update && apt-get install -y \
    curl \
    libudev-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Install spl-token CLI
RUN cargo install spl-token-cli --version 4.0.0

# ============================================================================
# Stage 4: Production Runtime
# ============================================================================
FROM node:20-slim AS runner

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy Solana CLI tools from builder
COPY --from=solana-builder /usr/local/cargo/bin/spl-token /usr/local/bin/spl-token

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

# Create directory for keypair
RUN mkdir -p /app/.config/solana && chown -R nextjs:nodejs /app/.config

# Set permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

# Environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application
CMD ["node", "server.js"]
