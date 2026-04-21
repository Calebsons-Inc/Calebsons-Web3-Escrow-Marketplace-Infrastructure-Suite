import { ethers } from "ethers";

const ESCROW_ABI = [
  "function getOrder(uint256 orderId) external view returns (tuple(uint256 id, address buyer, address seller, uint256 amount, uint8 status, uint256 createdAt, uint256 fulfillmentDeadline))",
  "function orderCount() external view returns (uint256)",
];

const STATUS_LABELS = [
  "PENDING",
  "FUNDED",
  "FULFILLED",
  "RELEASED",
  "DISPUTED",
  "RESOLVED",
];

function getProvider(): ethers.JsonRpcProvider {
  const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
  return new ethers.JsonRpcProvider(rpcUrl);
}

function getContract(): ethers.Contract {
  const provider = getProvider();
  const contractAddress =
    process.env.ESCROW_CONTRACT_ADDRESS || ethers.ZeroAddress;
  return new ethers.Contract(contractAddress, ESCROW_ABI, provider);
}

export const escrowResolvers = {
  Query: {
    escrowStatus: async (_: unknown, args: { orderId: number }) => {
      try {
        const contract = getContract();
        const order = await contract.getOrder(args.orderId);
        const statusIndex = Number(order.status);
        const onChainStatus = STATUS_LABELS[statusIndex] || "UNKNOWN";
        const balance = await getProvider().getBalance(
          await contract.getAddress()
        );

        return {
          orderId: args.orderId,
          onChainStatus,
          balance: ethers.formatEther(balance),
        };
      } catch (error) {
        console.error("Error fetching escrow status:", error);
        return {
          orderId: args.orderId,
          onChainStatus: "UNKNOWN",
          balance: "0",
        };
      }
    },
  },
};
