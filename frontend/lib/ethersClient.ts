import { ethers } from "ethers";

export const ESCROW_ABI = [
  "function createOrder(address buyer, address seller, uint256 amount) external returns (uint256)",
  "function depositFunds(uint256 orderId) external payable",
  "function markFulfilled(uint256 orderId) external",
  "function releaseFunds(uint256 orderId) external",
  "function raiseDispute(uint256 orderId) external",
  "function resolveDispute(uint256 orderId, address winner) external",
  "function getOrder(uint256 orderId) external view returns (tuple(uint256 id, address buyer, address seller, uint256 amount, uint8 status, uint256 createdAt, uint256 fulfillmentDeadline))",
  "function orderCount() external view returns (uint256)",
  "event OrderCreated(uint256 indexed orderId, address indexed buyer, address indexed seller, uint256 amount)",
  "event FundsDeposited(uint256 indexed orderId, address indexed buyer, uint256 amount)",
  "event OrderFulfilled(uint256 indexed orderId, address indexed seller)",
  "event FundsReleased(uint256 indexed orderId, address indexed seller, uint256 amount)",
  "event DisputeRaised(uint256 indexed orderId, address indexed raisedBy)",
  "event DisputeResolved(uint256 indexed orderId, address indexed winner, uint256 amount)",
];

export const ESCROW_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS || "";

export function getReadOnlyContract(providerUrl?: string): ethers.Contract {
  const url = providerUrl || process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545";
  const provider = new ethers.JsonRpcProvider(url);
  return new ethers.Contract(ESCROW_CONTRACT_ADDRESS, ESCROW_ABI, provider);
}

export async function getSignedContract(): Promise<ethers.Contract | null> {
  if (typeof window === "undefined") return null;
  const provider = new ethers.BrowserProvider((window as unknown as { ethereum: ethers.Eip1193Provider }).ethereum);
  const signer = await provider.getSigner();
  return new ethers.Contract(ESCROW_CONTRACT_ADDRESS, ESCROW_ABI, signer);
}

export async function createOrder(
  buyer: string,
  seller: string,
  amountEth: string
): Promise<ethers.ContractTransactionResponse> {
  const contract = await getSignedContract();
  if (!contract) throw new Error("No wallet connected");
  const amountWei = ethers.parseEther(amountEth);
  return contract.createOrder(buyer, seller, amountWei);
}

export async function depositFunds(
  orderId: number,
  amountEth: string
): Promise<ethers.ContractTransactionResponse> {
  const contract = await getSignedContract();
  if (!contract) throw new Error("No wallet connected");
  const amountWei = ethers.parseEther(amountEth);
  return contract.depositFunds(orderId, { value: amountWei });
}

export async function markFulfilled(
  orderId: number
): Promise<ethers.ContractTransactionResponse> {
  const contract = await getSignedContract();
  if (!contract) throw new Error("No wallet connected");
  return contract.markFulfilled(orderId);
}

export async function releaseFunds(
  orderId: number
): Promise<ethers.ContractTransactionResponse> {
  const contract = await getSignedContract();
  if (!contract) throw new Error("No wallet connected");
  return contract.releaseFunds(orderId);
}

export async function raiseDispute(
  orderId: number
): Promise<ethers.ContractTransactionResponse> {
  const contract = await getSignedContract();
  if (!contract) throw new Error("No wallet connected");
  return contract.raiseDispute(orderId);
}

export async function resolveDispute(
  orderId: number,
  winner: string
): Promise<ethers.ContractTransactionResponse> {
  const contract = await getSignedContract();
  if (!contract) throw new Error("No wallet connected");
  return contract.resolveDispute(orderId, winner);
}

export async function getOrderFromChain(orderId: number) {
  const contract = getReadOnlyContract();
  return contract.getOrder(orderId);
}
