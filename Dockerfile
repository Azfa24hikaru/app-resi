# syntax=docker/dockerfile:1

# ============================================================
# ResiKu — Inventory & Shipping Label App
# Multi-stage build (Next.js standalone + Prisma)
#
#   docker build -t resiku .
#   docker run -p 3000:3000 -e DATABASE_URL="postgresql://..." resiku
#
# DATABASE_URL dibaca saat runtime (bukan di-bake ke image).
# ============================================================

# ---------------------------- Base ----------------------------
FROM node:20-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# ---------------------------- Deps ----------------------------
# Layer dependensi di-cache terpisah agar build cepat saat source berubah
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# --------------------------- Builder --------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# DATABASE_URL dummy hanya untuk proses build (tidak ada query saat build);
# nilai asli tetap dibaca dari environment saat container berjalan.
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build?schema=public"
RUN npx prisma generate \
  && npm run build

# --------------------------- Migrator -------------------------
# Target khusus untuk menjalankan `prisma migrate deploy`:
#   docker compose run --rm migrate
FROM builder AS migrator
CMD ["npx", "prisma", "migrate", "deploy"]

# ---------------------------- Runner --------------------------
# Runtime produksi: server standalone + Prisma client (engine) + static assets
FROM base AS runner
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000

RUN groupadd --system --gid 1001 nodejs \
  && useradd  --system --uid 1001 --gid nodejs nextjs

# Server standalone (berisi server.js + node_modules ter-trace, termasuk .prisma)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# Static assets (JS/CSS client)
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Entry point: validasi env sebelum start (fail-fast dengan pesan jelas)
COPY --chown=nextjs:nodejs docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER nextjs
EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "server.js"]
