# ─────────────────────────────────────────────
# Stage 1: Build
# ─────────────────────────────────────────────
FROM node:20-alpine AS builder

# Install pnpm + OpenSSL for Prisma
RUN apk add --no-cache openssl && npm install -g pnpm@9

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
COPY apps/api/package.json ./apps/api/

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Copy source
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Build shared package first
RUN pnpm --filter shared build

# Generate Prisma client
RUN pnpm --filter database generate

# Build API
RUN pnpm --filter api build

# ─────────────────────────────────────────────
# Stage 2: Production
# ─────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN npm install -g pnpm@9

WORKDIR /app

# Install Chromium for Puppeteer + OpenSSL for Prisma
RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont openssl

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Copy built files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/

COPY --from=builder /app/packages/database/prisma ./packages/database/prisma

# Ensure workspace packages are resolvable at runtime
RUN mkdir -p node_modules/@helpmytravel && \
    ln -sf /app/packages/database node_modules/@helpmytravel/database && \
    ln -sf /app/packages/shared node_modules/@helpmytravel/shared

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy --schema=packages/database/prisma/schema.prisma && node apps/api/dist/main"]
