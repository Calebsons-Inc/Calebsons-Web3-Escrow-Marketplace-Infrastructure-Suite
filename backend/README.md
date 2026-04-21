# Calebsons Escrow Backend

GraphQL API server powering the Calebsons Web3 Escrow Marketplace. Built with Apollo Server, Prisma ORM, PostgreSQL, and ethers.js for on-chain interaction.

## Stack

| Layer       | Technology              |
|-------------|-------------------------|
| API         | Apollo Server v4 (GraphQL) |
| Runtime     | Node.js 20 / TypeScript |
| ORM         | Prisma 5 + PostgreSQL   |
| Blockchain  | ethers.js v6            |
| Framework   | Express 4               |

---

## Prerequisites

- Node.js ≥ 20
- PostgreSQL 15 (or Docker)
- A running EVM node (Anvil / Hardhat / Infura)

---

## Setup

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/escrow_db"
RPC_URL="http://127.0.0.1:8545"
ESCROW_CONTRACT_ADDRESS="0xYourDeployedContractAddress"
PORT=4000
FRONTEND_URL="http://localhost:3000"
```

### 3. Run database migrations

```bash
npm run prisma:migrate
# or for production:
npx prisma migrate deploy
```

### 4. Generate Prisma client

```bash
npm run prisma:generate
```

### 5. Start the server

```bash
# Development (hot-reload)
npm run dev

# Production build
npm run build
npm start
```

The GraphQL playground is available at: `http://localhost:4000/graphql`

---

## Environment Variables

| Variable                  | Required | Default                          | Description                              |
|---------------------------|----------|----------------------------------|------------------------------------------|
| `DATABASE_URL`            | ✅        | —                                | PostgreSQL connection string             |
| `RPC_URL`                 | ✅        | `http://127.0.0.1:8545`          | EVM JSON-RPC endpoint                    |
| `ESCROW_CONTRACT_ADDRESS` | ✅        | `0x000...000`                    | Deployed EscrowMarketplace address       |
| `PORT`                    | ❌        | `4000`                           | HTTP server port                         |
| `FRONTEND_URL`            | ❌        | `http://localhost:3000`          | Allowed CORS origin                      |

---

## GraphQL API

### Queries

#### `orders`
List all orders, optionally filtered by status, buyer, or seller.

```graphql
query {
  orders(status: FUNDED, buyer: "0xAbc...") {
    id
    onChainId
    buyer
    seller
    amount
    status
    createdAt
  }
}
```

#### `order`
Fetch a single order by database ID.

```graphql
query {
  order(id: "clx...") {
    id
    onChainId
    status
    txHash
  }
}
```

#### `orderByChainId`
Fetch a single order by its on-chain ID.

```graphql
query {
  orderByChainId(onChainId: 1) {
    id
    buyer
    seller
    amount
    status
  }
}
```

#### `users`
List all registered users.

```graphql
query {
  users {
    id
    address
    createdAt
    orders { id status }
  }
}
```

#### `user`
Fetch a single user by wallet address.

```graphql
query {
  user(address: "0xAbc...") {
    id
    address
    orders { id onChainId status }
  }
}
```

#### `escrowStatus`
Query live on-chain state of an escrow order.

```graphql
query {
  escrowStatus(orderId: 1) {
    orderId
    onChainStatus
    balance
  }
}
```

---

### Mutations

#### `createOrder`
Create a new escrow order record in the database.

```graphql
mutation {
  createOrder(
    buyer: "0xBuyer..."
    seller: "0xSeller..."
    amount: "1.0"
  ) {
    order { id onChainId status }
    message
  }
}
```

#### `deposit`
Record a deposit transaction on an order (transitions to FUNDED).

```graphql
mutation {
  deposit(
    orderId: "clx..."
    txHash: "0xTxHash..."
    blockNumber: 12345
  ) {
    id
    status
    txHash
  }
}
```

#### `fulfill`
Mark an order as fulfilled by the seller.

```graphql
mutation {
  fulfill(orderId: "clx...") {
    id
    status
  }
}
```

#### `release`
Release funds to the seller (buyer confirms fulfillment).

```graphql
mutation {
  release(orderId: "clx...") {
    id
    status
  }
}
```

#### `dispute`
Raise a dispute on a funded or fulfilled order.

```graphql
mutation {
  dispute(orderId: "clx...") {
    id
    status
  }
}
```

#### `resolve`
Admin resolves a disputed order, specifying the winner.

```graphql
mutation {
  resolve(orderId: "clx...", winner: "0xWinner...") {
    id
    status
  }
}
```

#### `upsertUser`
Register or retrieve a user by wallet address.

```graphql
mutation {
  upsertUser(address: "0xAbc...") {
    id
    address
    createdAt
  }
}
```

---

## Data Models

### Order

| Field         | Type     | Description                        |
|---------------|----------|------------------------------------|
| id            | String   | CUID database primary key          |
| onChainId     | Int      | Corresponds to contract orderCount |
| buyer         | String   | Buyer wallet address               |
| seller        | String   | Seller wallet address              |
| amount        | String   | ETH amount as string               |
| status        | String   | PENDING / FUNDED / FULFILLED / RELEASED / DISPUTED / RESOLVED |
| txHash        | String?  | Deposit transaction hash           |
| blockNumber   | Int?     | Block number of deposit            |
| createdAt     | DateTime | Record creation time               |
| updatedAt     | DateTime | Last update time                   |

### User

| Field     | Type     | Description              |
|-----------|----------|--------------------------|
| id        | String   | CUID database primary key |
| address   | String   | Unique wallet address    |
| createdAt | DateTime | Registration time        |
| orders    | Order[]  | Related orders           |

---

## Health Check

```bash
curl http://localhost:4000/health
# {"status":"ok","timestamp":"2024-01-01T00:00:00.000Z"}
```

---

## Docker

See the root `docker/` directory for Dockerfile and `docker-compose.yml`.

```bash
# From project root
docker compose -f docker/docker-compose.yml up backend postgres
```

---

## License

MIT
