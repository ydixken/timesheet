# Stage 1: Install dependencies
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/backend/package.json apps/backend/
RUN pnpm install --frozen-lockfile

# Stage 2: Build
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/backend apps/backend
RUN pnpm --filter @timesheet/shared build && pnpm --filter @timesheet/backend build

# Stage 3: Production image with Puppeteer
FROM ghcr.io/puppeteer/puppeteer:24 AS final
WORKDIR /app

# Create a stable Chrome path from whatever version the base image ships
USER root
RUN ln -sf $(find /home/pptruser/.cache/puppeteer/chrome -name chrome -type f | head -1) /usr/local/bin/chrome-stable
USER pptruser
ENV PUPPETEER_EXECUTABLE_PATH=/usr/local/bin/chrome-stable

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/src/db/migrations ./apps/backend/dist/db/migrations
COPY --from=builder /app/apps/backend/package.json ./apps/backend/
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "apps/backend/dist/main.js"]
