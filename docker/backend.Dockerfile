FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci --only=production

FROM base AS build-deps
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci

FROM build-deps AS builder
COPY backend/ .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY backend/prisma ./prisma
COPY backend/src/graphql/schema.graphql ./dist/graphql/schema.graphql

EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
