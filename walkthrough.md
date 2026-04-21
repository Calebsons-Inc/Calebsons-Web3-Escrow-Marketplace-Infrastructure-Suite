# walkthrough.md — Full Project Setup Guide

This guide walks a new developer from cloning the repository to running the full Web3 Escrow Marketplace locally. It covers:

- Smart contracts (Foundry + Anvil)
- Backend (Node.js + GraphQL + Prisma + PostgreSQL)
- Frontend (Next.js + Wagmi + RainbowKit)

Everything is reproducible and beginner‑friendly.

## 1. Prerequisites

Install the following tools before starting:

- Node.js 18+
- npm or pnpm
- Git
- Foundry (Forge + Anvil)
- PostgreSQL (Homebrew or Docker)

Install Foundry:

    curl -L https://foundry.paradigm.xyz | bash
    foundryup

Install PostgreSQL (Homebrew):

    brew install postgresql
    brew services start postgresql

If Postgres has no cluster initialized:

    initdb /opt/homebrew/var/postgres
    createuser -s postgres

## 2. Clone the Repository

    git clone <your-repo-url>
    cd <project-root>

You should see:

    contracts/
    backend/
    frontend/
    docker-compose.yml

## 3. Start Local Blockchain (Anvil)

Open a terminal:

    cd contracts
    anvil

This starts a local chain at:

    http://localhost:8545

Keep this terminal open.

## 4. Deploy Smart Contracts

Open a new terminal:

    cd contracts
    forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast

Copy the deployed contract address shown in the output.

## 5. Create PostgreSQL Database

    psql -U postgres
    CREATE DATABASE escrow_db;
    \q

## 6. Configure Backend Environment

    cd backend
    cp .env.example .env

Edit .env:

    DATABASE_URL="postgresql://postgres@localhost:5432/escrow_db?schema=public"
    RPC_URL="http://localhost:8545"
    CONTRACT_ADDRESS="<your-deployed-contract-address>"

## 7. Run Prisma Migrations

    cd backend
    npx prisma migrate dev
    npx prisma generate

This creates tables and syncs the schema.

## 8. Start Backend Server

    npm install
    npm run dev

Backend runs at:

    http://localhost:4000/graphql

Open it in your browser to confirm GraphQL Playground loads.

## 9. Configure Frontend Environment

    cd frontend
    cp .env.example .env.local

Edit .env.local:

    NEXT_PUBLIC_GRAPHQL_URL="http://localhost:4000/graphql"
    NEXT_PUBLIC_RPC_URL="http://localhost:8545"
    NEXT_PUBLIC_CONTRACT_ADDRESS="<your-deployed-contract-address>"
    NEXT_PUBLIC_WC_PROJECT_ID="<your-walletconnect-project-id>"

Create a WalletConnect project ID at:

    https://cloud.walletconnect.com

## 10. Start Frontend

    npm install
    npm run dev

Open:

    http://localhost:3000

You should see:

- Connect Wallet
- Create Order
- Orders List

## 11. Full End‑to‑End Test Flow

### Connect Wallet

Use MetaMask with the default Anvil private key:

    0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

### Create Order

Fill in buyer, seller, amount → submit.

### Deposit

Triggers on‑chain transaction → order becomes FUNDED.

### Fulfill

Seller marks order fulfilled.

### Release

Buyer releases funds → ETH transfers to seller.

### Dispute / Resolve

Admin resolves disputes.

If all steps work, the entire system is functioning.

## 12. Optional: Run Everything with Docker

From project root:

    docker compose up --build

This launches:

- Anvil
- Postgres
- Backend
- Frontend
