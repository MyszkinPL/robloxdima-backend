FROM node:20-alpine AS base-node
RUN apk add --no-cache libc6-compat python3 py3-pip

FROM base-node AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

FROM base-node AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
RUN mkdir -p public
COPY . .

RUN npx prisma generate
RUN npm run build

FROM base-node AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

RUN mkdir .next
RUN chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

RUN mkdir -p backend
COPY --from=builder /app/bot ./backend/bot
RUN touch backend/__init__.py

RUN pip3 install --no-cache-dir aiogram httpx asyncpg

USER nextjs

EXPOSE 3001
ENV PORT=3001
ENV BACKEND_BASE_URL=http://localhost:3001

CMD ["/bin/sh", "-c", "node server.js & python3 -m backend.bot.main"]
