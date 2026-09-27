# Multi-stage Dockerfile: build static Vite UI then run Express OID4VCI + Verifier Policy server
# Zero secret exposure: build phase only consumes public configuration metadata.

# ---------- Stage 1: Build Vite Frontend ----------
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .

# Only non-sensitive, public configuration is injected at build time
ARG BASE_URL
ARG OID4VCI_BASE_URL
ARG ISSUER_DID
ARG SCHEMA_URL
ARG DEGREE_CONTEXT_URL
ARG IU_SMARTCERT_CONTEXT_URL
ARG MERKLE_CONTEXT_URL
ARG CHAIN_ID
ARG RPC_URL
ARG CONTRACT_ADDRESS

ENV BASE_URL=${BASE_URL}
ENV OID4VCI_BASE_URL=${OID4VCI_BASE_URL}
ENV ISSUER_DID=${ISSUER_DID}
ENV SCHEMA_URL=${SCHEMA_URL}
ENV DEGREE_CONTEXT_URL=${DEGREE_CONTEXT_URL}
ENV IU_SMARTCERT_CONTEXT_URL=${IU_SMARTCERT_CONTEXT_URL}
ENV MERKLE_CONTEXT_URL=${MERKLE_CONTEXT_URL}
ENV CHAIN_ID=${CHAIN_ID}
ENV RPC_URL=${RPC_URL}
ENV CONTRACT_ADDRESS=${CONTRACT_ADDRESS}

# Build production assets (Vite compiles HTML/JS/CSS into /app/dist)
RUN npm run build

# ---------- Stage 2: Runtime Express Server ----------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi \
 && npm install -g tsx

# Copy built frontend assets and server sources
COPY --from=builder /app/dist ./dist
COPY src ./src
COPY tsconfig.json ./tsconfig.json

EXPOSE 10000

# Server runs on PORT dynamically assigned by Render ($PORT, default 10000)
CMD ["tsx", "src/server/entries/oid4vci.server.ts"]
