# Stage 1: Dependencies & Builder
FROM oven/bun:1-alpine AS builder
WORKDIR /app

# Copy order-service package files and lockfile
COPY services/order-service/package.json services/order-service/bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile || bun install

# Copy order-service source code
COPY services/order-service/ ./

# Build NestJS production bundle (dist/main.js)
RUN bun run build

# Stage 2: Minimal Production Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8083

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy production dependencies and compiled dist output
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json

USER nestjs

EXPOSE 8083

CMD ["node", "dist/main.js"]
