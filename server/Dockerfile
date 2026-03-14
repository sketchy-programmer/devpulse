# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files first — Docker caches this layer if deps haven't changed
COPY package*.json ./
RUN npm ci --omit=dev

COPY src/ ./src/

# ── Production stage ──────────────────────────────────────────────────────────
FROM node:18-alpine AS production

# Run as non-root user (OWASP A05 — Security Misconfiguration)
RUN addgroup -S devpulse && adduser -S devpulse -G devpulse

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY package*.json ./

USER devpulse

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

CMD ["node", "src/index.js"]
