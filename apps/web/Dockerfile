# Stage 1: Dependencies & Builder
FROM oven/bun:1-alpine AS builder
WORKDIR /app

# Copy root monorepo package files and bun lockfile
COPY package.json bun.lock ./
COPY apps/web/package.json ./apps/web/

# Install dependencies with frozen lockfile
RUN bun install --frozen-lockfile

# Copy source code
COPY apps/web ./apps/web

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build standalone Next.js bundle
WORKDIR /app/apps/web
RUN bun run build

# Stage 2: Minimal Production Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy static assets and standalone server output
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs

EXPOSE 3000

CMD ["sh", "-c", "if [ -f apps/web/server.js ]; then node apps/web/server.js; else node server.js; fi"]
