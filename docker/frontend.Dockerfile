FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --only=production

FROM base AS build-deps
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

FROM build-deps AS builder
COPY frontend/ .
ARG NEXT_PUBLIC_GRAPHQL_URL
ARG NEXT_PUBLIC_RPC_URL
ARG NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS
ARG NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
ENV NEXT_PUBLIC_GRAPHQL_URL=${NEXT_PUBLIC_GRAPHQL_URL}
ENV NEXT_PUBLIC_RPC_URL=${NEXT_PUBLIC_RPC_URL}
ENV NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS=${NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS}
ENV NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=${NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID}
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
