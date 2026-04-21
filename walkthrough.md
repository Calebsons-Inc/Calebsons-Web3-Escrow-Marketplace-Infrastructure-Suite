# Calebsons Web3 Escrow Marketplace — Architecture Walkthrough

This document provides a comprehensive guide to understanding, setting up, and running the full Calebsons Web3 Escrow Marketplace Infrastructure Suite.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture Diagram](#2-architecture-diagram)
3. [Component Deep Dives](#3-component-deep-dives)
   - [Smart Contract (Foundry)](#31-smart-contract-foundry)
   - [Backend (Apollo GraphQL + Prisma)](#32-backend-apollo-graphql--prisma)
   - [Frontend (Next.js + RainbowKit)](#33-frontend-nextjs--rainbowkit)
   - [Infrastructure (Docker)](#34-infrastructure-docker)
   - [CI/CD (GitHub Actions)](#35-cicd-github-actions)
4. [Order Lifecycle](#4-order-lifecycle)
5. [Setup Guide](#5-setup-guide)
   - [Prerequisites](#51-prerequisites)
   - [Local Development (Step by Step)](#52-local-development-step-by-step)
   - [Docker Compose (Full Stack)](#53-docker-compose-full-stack)
6. [How All Parts Interact](#6-how-all-parts-interact)
7. [Security Considerations](#7-security-considerations)
8. [Extending the Project](#8-extending-the-project)

---

## 1. Project Overview

Calebsons Web3 Escrow Marketplace is a trustless escrow system built on EVM-compatible blockchains. It allows:

- **Buyers** to create and fund escrow agreements for purchases
- **Sellers** to mark orders as fulfilled once goods/services are delivered
- **Buyers** to release funds when satisfied
- Either party to **raise a dispute** if something goes wrong
- A trusted **admin** to arbitrate and **resolve disputes** on-chain

The system is composed of four layers:
1. **Solidity Smart Contract** — the source of truth for escrow logic and fund custody
2. **GraphQL Backend** — off-chain data indexing, user management, and API layer
3. **Next.js Frontend** — web interface for interacting with the marketplace
4. **Docker Infrastructure** — containerized services for reproducible deployments

---

## 2. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER BROWSER                              │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │             Next.js 15 Frontend (port 3000)               │   │
│  │                                                           │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │   │
│  │  │  RainbowKit  │  │ GraphQL      │  │  ethers.js v6  │  │   │
│  │  │  + wagmi     │  │ Client       │  │  (direct RPC)  │  │   │
│  │  └──────┬───────┘  └──────┬───────┘  └───────┬────────┘  │   │
│  └─────────┼────────────────┼──────────────────┼────────────┘   │
└────────────┼────────────────┼──────────────────┼────────────────┘
             │ wallet txn     │ GraphQL           │ eth_call / JSON-RPC
             ▼                ▼                   ▼
┌─────────────────┐  ┌──────────────────────┐  ┌──────────────────┐
│   MetaMask /    │  │  Apollo Server v4    │  │   Anvil / EVM    │
│   WalletConnect │  │  Backend (port 4000) │  │   Node (8545)    │
└────────┬────────┘  │                      │  │                  │
         │           │  ┌────────────────┐  │  │  ┌────────────┐ │
         │           │  │ Prisma ORM     │  │  │  │  Escrow    │ │
         │           │  └───────┬────────┘  │  │  │  Contract  │ │
         │           └──────────┼───────────┘  │  └────────────┘ │
         │                      ▼              └──────────────────┘
         │           ┌──────────────────────┐
         │           │  PostgreSQL (5432)   │
         │           │  - users table       │
         │           │  - orders table      │
         │           └──────────────────────┘
         │
         └──────► EVM Node ──► EscrowMarketplace.sol
```

---

## 3. Component Deep Dives

### 3.1 Smart Contract (Foundry)

**Location:** `contracts/`

The `EscrowMarketplace.sol` contract is the trustless core of the system. Key design decisions:

#### Access Control
- Uses OpenZeppelin's `AccessControl` for role-based permissions
- `ADMIN_ROLE` is granted to the deployer and can resolve disputes
- Buyer/seller restrictions enforced via modifiers per-order

#### State Machine
Each order follows a strict state machine:
```
PENDING → FUNDED → FULFILLED → RELEASED
                ↘              ↗
              DISPUTED → RESOLVED
```

#### Reentrancy Protection
All ETH-transferring functions (`releaseFunds`, `resolveDispute`) use the `nonReentrant` modifier from OpenZeppelin's `ReentrancyGuard`.

#### Funds Custody
- ETH is held by the contract itself (not an external wallet)
- The exact `msg.value` must equal `order.amount` on deposit
- Funds can only be released to the designated seller or dispute winner

#### Testing
Tests use Foundry's `forge test` with:
- Full happy path coverage (create → deposit → fulfill → release)
- Dispute and resolution flow
- Authorization revert tests
- Wrong amount revert tests
- Multiple simultaneous order tests

### 3.2 Backend (Apollo GraphQL + Prisma)

**Location:** `backend/`

The backend provides an off-chain database mirror of order state, user management, and on-chain query capabilities.

#### Why an off-chain backend?
- Blockchain data is hard to query (no filtering, no pagination natively)
- User profiles and metadata are not stored on-chain
- Transaction hashes and block numbers need to be associated with orders
- The GraphQL API enables clean frontend data access

#### Data Flow
1. Frontend calls `createOrder` mutation → backend creates DB record
2. User sends on-chain transaction (via ethers.js directly)
3. Frontend calls `deposit` mutation with tx hash → backend updates status
4. Subsequent state transitions are recorded via mutations

#### Resolvers
- **orderResolver.ts** — CRUD operations on orders
- **userResolver.ts** — User upsert and lookup by address
- **escrowResolver.ts** — Live on-chain state queries via ethers.js

#### Database Schema
PostgreSQL via Prisma with two models:
- `User`: wallet address → user profile
- `Order`: full order state, linked to buyer user by address

### 3.3 Frontend (Next.js + RainbowKit)

**Location:** `frontend/`

A dark-themed Web3 UI built with Next.js App Router and Tailwind CSS.

#### Wallet Connection
RainbowKit provides a polished wallet connection UI supporting MetaMask, WalletConnect, Coinbase Wallet, and more. The `Providers` component wraps the app with wagmi context.

#### Pages
| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `app/page.tsx` | Landing page with hero and features |
| `/dashboard` | `app/dashboard/page.tsx` | Statistics and recent orders |
| `/orders` | `app/orders/page.tsx` | Order list with filtering and creation |
| `/orders/[id]` | `app/orders/[id]/page.tsx` | Order detail with actions |

#### GraphQL Client
A minimal `fetch`-based GraphQL client (`lib/graphqlClient.ts`) avoids heavy dependencies while providing full typed request/response handling.

#### Ethers Client
`lib/ethersClient.ts` provides typed wrappers for all contract functions. Supports both read-only (provider) and write (signer/wallet) modes.

### 3.4 Infrastructure (Docker)

**Location:** `docker/`

Four services in `docker-compose.yml`:

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| `anvil` | foundry | 8545 | Local EVM blockchain |
| `postgres` | postgres:15 | 5432 | Database |
| `backend` | custom | 4000 | GraphQL API |
| `frontend` | custom | 3000 | Web UI |

Services have health checks and dependency ordering. The backend waits for both postgres and anvil to be healthy before starting.

### 3.5 CI/CD (GitHub Actions)

**Location:** `cicd/github_actions/`

Three workflow files trigger on path-specific changes:

| Workflow | Trigger | Jobs |
|----------|---------|------|
| `contracts_ci.yml` | `contracts/**` | Foundry tests, Slither security scan |
| `backend_ci.yml` | `backend/**` | TypeScript build, GraphQL schema validation |
| `frontend_ci.yml` | `frontend/**` | ESLint, Next.js build, TypeScript check |

---

## 4. Order Lifecycle

### Happy Path

```
1. Buyer calls createOrder(buyer, seller, amount)
   └─ Backend: creates DB record (PENDING)
   └─ Contract: emits OrderCreated event

2. Buyer calls depositFunds{value: amount}(orderId)
   └─ Backend: records txHash, status → FUNDED
   └─ Contract: holds ETH, emits FundsDeposited

3. Seller delivers goods/services off-chain

4. Seller calls markFulfilled(orderId)
   └─ Backend: status → FULFILLED
   └─ Contract: emits OrderFulfilled

5. Buyer confirms delivery, calls releaseFunds(orderId)
   └─ Backend: status → RELEASED
   └─ Contract: transfers ETH to seller, emits FundsReleased
```

### Dispute Path

```
1-2. Same as above (order reaches FUNDED or FULFILLED)

3. Either party calls raiseDispute(orderId)
   └─ Backend: status → DISPUTED
   └─ Contract: emits DisputeRaised

4. Admin reviews the case off-chain

5. Admin calls resolveDispute(orderId, winner)
   └─ Backend: status → RESOLVED
   └─ Contract: transfers ETH to winner, emits DisputeResolved
```

---

## 5. Setup Guide

### 5.1 Prerequisites

- **Node.js** ≥ 20: https://nodejs.org
- **Foundry**: `curl -L https://foundry.paradigm.xyz | bash && foundryup`
- **Docker + Docker Compose**: https://docs.docker.com/get-docker/
- **PostgreSQL** (if running locally without Docker)
- **WalletConnect Project ID**: https://cloud.walletconnect.com

### 5.2 Local Development (Step by Step)

#### Step 1: Deploy the Smart Contract

```bash
cd contracts

# Install OpenZeppelin
forge install OpenZeppelin/openzeppelin-contracts --no-commit

# Start local Anvil node (in a separate terminal)
anvil --chain-id 31337

# Deploy the contract
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Note the deployed contract address from output
```

#### Step 2: Start the Backend

```bash
cd backend
npm install

# Configure environment
cp .env.example .env
# Edit .env: set DATABASE_URL, ESCROW_CONTRACT_ADDRESS

# Run migrations
npx prisma migrate dev --name init

# Start server
npm run dev
# → Server running at http://localhost:4000/graphql
```

#### Step 3: Start the Frontend

```bash
cd frontend
npm install

# Create .env.local
cat > .env.local << EOF
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:4000/graphql
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS=0xYourContractAddress
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-project-id
EOF

npm run dev
# → App running at http://localhost:3000
```

### 5.3 Docker Compose (Full Stack)

```bash
# From project root
cd docker

# Set contract address (after deploying)
export ESCROW_CONTRACT_ADDRESS=0xYourContractAddress
export WALLETCONNECT_PROJECT_ID=your-project-id

# Start all services
docker compose up --build

# Services:
# - Anvil:    http://localhost:8545
# - Backend:  http://localhost:4000/graphql
# - Frontend: http://localhost:3000
# - Postgres: localhost:5432
```

#### Deploy Contract to Docker Anvil

```bash
# After docker compose is up
forge script contracts/script/Deploy.s.sol \
  --rpc-url http://127.0.0.1:8545 \
  --broadcast \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Update ESCROW_CONTRACT_ADDRESS and restart backend + frontend
```

---

## 6. How All Parts Interact

```
User Action: "Create an order"
│
├─ 1. User fills form in Next.js UI (frontend/app/orders/page.tsx)
│
├─ 2. Frontend calls createOrder GraphQL mutation
│     → fetchGraphQL(CREATE_ORDER, { buyer, seller, amount })
│
├─ 3. Backend orderResolver.Mutation.createOrder runs
│     → Upserts buyer user in PostgreSQL
│     → Creates Order record (status: PENDING)
│     → Returns order data
│
└─ 4. UI updates order list

User Action: "Deposit funds"
│
├─ 1. User connects wallet via RainbowKit
│
├─ 2. User clicks "Record Deposit" on order detail page
│     (In production: first send on-chain tx via ethersClient.ts)
│
├─ 3. On-chain: buyer calls depositFunds{value}(orderId)
│     → Contract validates amount, sets status = FUNDED
│     → Holds ETH in contract
│
├─ 4. Frontend calls deposit GraphQL mutation with txHash
│     → Backend updates DB: status = FUNDED, txHash recorded
│
└─ 5. UI refreshes order status

User Action: "Check on-chain status"
│
├─ 1. Frontend calls escrowStatus(orderId) GraphQL query
│
├─ 2. Backend escrowResolver calls contract.getOrder(orderId)
│     via ethers.js JsonRpcProvider
│
└─ 3. Returns live on-chain status and contract ETH balance
```

---

## 7. Security Considerations

### Smart Contract
- **Reentrancy**: All ETH transfers protected by `nonReentrant`
- **Access Control**: Role-based with OpenZeppelin AccessControl
- **Input Validation**: Zero address checks, amount > 0, buyer ≠ seller
- **State Machine**: Strict status transitions prevent double-spends
- **No Admin Rug**: Admin can only send funds to buyer or seller, never to themselves (unless they are a party)

### Backend
- **CORS**: Restricted to configured FRONTEND_URL
- **No Private Keys**: Backend is read-only for on-chain data
- **Prisma**: Parameterized queries prevent SQL injection
- **Environment Variables**: Secrets never hardcoded

### Frontend
- **No Private Key Exposure**: All signing done through browser wallet
- **CSP Headers**: Recommended to add in production via next.config.ts
- **Input Validation**: Address format validation recommended before submission

---

## 8. Extending the Project

### Add ERC-20 Token Support
1. Add `token` field to `Order` struct in Solidity
2. Use `IERC20.transferFrom` for deposits instead of `msg.value`
3. Update GraphQL schema with `tokenAddress` field
4. Add token approval step in frontend before deposit

### Add Event Indexing
1. Deploy a subgraph on The Graph Protocol
2. Index `OrderCreated`, `FundsDeposited`, etc. events
3. Replace backend GraphQL queries with subgraph queries for on-chain data

### Add Email/Push Notifications
1. Add webhook or notification service to backend
2. Listen for order status changes and trigger notifications
3. Use WalletConnect's notification API for wallet-native alerts

### Add Time-Based Auto-Release
1. Add Chainlink Automation (formerly Keepers) to call `releaseFunds` after `fulfillmentDeadline`
2. Or implement an off-chain cron job that monitors deadlines

### Multi-Chain Support
1. Add chain configurations to `providers.tsx`
2. Deploy contract to each chain
3. Store `chainId` in the Order model
4. Route ethers.js calls based on chain

---

*This document covers the architecture as of the initial release. For the latest updates, refer to the individual component READMEs.*
