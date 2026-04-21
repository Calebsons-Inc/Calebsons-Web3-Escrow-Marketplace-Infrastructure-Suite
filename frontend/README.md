# Calebsons Escrow Frontend

Next.js 15 frontend for the Calebsons Web3 Escrow Marketplace. Features wallet connection via RainbowKit/wagmi, real-time order management, and direct smart contract interaction through ethers.js.

## Stack

| Layer          | Technology                        |
|----------------|-----------------------------------|
| Framework      | Next.js 15 (App Router)           |
| Language       | TypeScript                        |
| Styling        | Tailwind CSS                      |
| Wallet         | RainbowKit + wagmi + viem         |
| Blockchain     | ethers.js v6                      |
| Data Fetching  | GraphQL (fetch-based client)      |
| State          | React Query (@tanstack/react-query) |

---

## Prerequisites

- Node.js ≥ 20
- A running backend server (see `backend/README.md`)
- A WalletConnect Project ID (get one free at [cloud.walletconnect.com](https://cloud.walletconnect.com))

---

## Setup

### 1. Install dependencies

```bash
cd frontend
npm install
```

### 2. Configure environment

Create a `.env.local` file:

```env
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:4000/graphql
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS=0xYourDeployedContractAddress
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-walletconnect-project-id
```

### 3. Start the development server

```bash
npm run dev
```

The app is available at: `http://localhost:3000`

### 4. Build for production

```bash
npm run build
npm start
```

---

## Environment Variables

| Variable                              | Required | Description                                      |
|---------------------------------------|----------|--------------------------------------------------|
| `NEXT_PUBLIC_GRAPHQL_URL`             | ✅        | GraphQL API endpoint (backend)                   |
| `NEXT_PUBLIC_RPC_URL`                 | ✅        | EVM JSON-RPC endpoint for read-only calls        |
| `NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS` | ✅        | Deployed EscrowMarketplace contract address      |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`| ✅        | WalletConnect v2 project ID                      |

---

## Pages

### `/` — Landing Page
- Hero section with project description
- Feature highlights
- Navigation to dashboard and orders

### `/dashboard` — Dashboard
- Overview statistics (total orders, funded, released, disputes)
- Total ETH volume across all orders
- Success rate and dispute rate metrics
- Recent orders table with quick links

### `/orders` — Orders List
- Full paginated orders table
- Filter by status (ALL / PENDING / FUNDED / FULFILLED / RELEASED / DISPUTED / RESOLVED)
- Create new order modal
- Quick links to order detail pages

### `/orders/[id]` — Order Detail
- Full order information (parties, amounts, timestamps)
- Visual status progress indicator
- Context-sensitive action buttons:
  - **PENDING**: Record deposit transaction hash
  - **FUNDED**: Mark fulfilled (seller) or raise dispute
  - **FULFILLED**: Release funds (buyer) or raise dispute
  - **DISPUTED**: Admin resolve with winner selection
  - **RELEASED / RESOLVED**: Finalized — no actions

---

## Components

### `WalletConnect`
Renders the RainbowKit `ConnectButton` with responsive display options for balance, chain status, and account avatar.

---

## Library Utilities

### `lib/graphqlClient.ts`
Lightweight GraphQL fetch utility. Sends POST requests to the backend and throws on GraphQL errors.

```typescript
import { fetchGraphQL } from "@/lib/graphqlClient";

const data = await fetchGraphQL<{ orders: Order[] }>(GET_ORDERS);
```

### `lib/ethersClient.ts`
Direct smart contract interaction utilities using ethers.js v6.

```typescript
import { createOrder, depositFunds, releaseFunds } from "@/lib/ethersClient";

// Create order on-chain
const tx = await createOrder(buyerAddress, sellerAddress, "1.0");
await tx.wait();

// Deposit funds
const tx = await depositFunds(orderId, "1.0");
await tx.wait();
```

---

## Supported Chains

| Chain    | Type       | Chain ID |
|----------|------------|----------|
| Mainnet  | Production | 1        |
| Sepolia  | Testnet    | 11155111 |
| Hardhat  | Local      | 31337    |

---

## Docker

```bash
# From project root
docker compose -f docker/docker-compose.yml up frontend
```

---

## Linting

```bash
npm run lint
```

---

## License

MIT
