import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const orderResolvers = {
  Query: {
    orders: async (
      _: unknown,
      args: { status?: string; buyer?: string; seller?: string }
    ) => {
      const where: Record<string, unknown> = {};
      if (args.status) where.status = args.status;
      if (args.buyer) where.buyer = args.buyer;
      if (args.seller) where.seller = args.seller;
      return prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: { buyerUser: true },
      });
    },

    order: async (_: unknown, args: { id: string }) => {
      return prisma.order.findUnique({
        where: { id: args.id },
        include: { buyerUser: true },
      });
    },

    orderByChainId: async (_: unknown, args: { onChainId: number }) => {
      return prisma.order.findUnique({
        where: { onChainId: args.onChainId },
        include: { buyerUser: true },
      });
    },
  },

  Mutation: {
    createOrder: async (
      _: unknown,
      args: { buyer: string; seller: string; amount: string }
    ) => {
      // Ensure buyer user exists
      await prisma.user.upsert({
        where: { address: args.buyer },
        update: {},
        create: { address: args.buyer },
      });

      const latestOrder = await prisma.order.findFirst({
        orderBy: { onChainId: "desc" },
      });
      const nextOnChainId = (latestOrder?.onChainId ?? 0) + 1;

      const order = await prisma.order.create({
        data: {
          onChainId: nextOnChainId,
          buyer: args.buyer,
          seller: args.seller,
          amount: args.amount,
          status: "PENDING",
        },
        include: { buyerUser: true },
      });

      return { order, message: "Order created successfully" };
    },

    deposit: async (
      _: unknown,
      args: { orderId: string; txHash: string; blockNumber?: number }
    ) => {
      return prisma.order.update({
        where: { id: args.orderId },
        data: {
          status: "FUNDED",
          txHash: args.txHash,
          blockNumber: args.blockNumber,
        },
        include: { buyerUser: true },
      });
    },

    fulfill: async (_: unknown, args: { orderId: string }) => {
      return prisma.order.update({
        where: { id: args.orderId },
        data: { status: "FULFILLED" },
        include: { buyerUser: true },
      });
    },

    release: async (_: unknown, args: { orderId: string }) => {
      return prisma.order.update({
        where: { id: args.orderId },
        data: { status: "RELEASED" },
        include: { buyerUser: true },
      });
    },

    dispute: async (_: unknown, args: { orderId: string }) => {
      return prisma.order.update({
        where: { id: args.orderId },
        data: { status: "DISPUTED" },
        include: { buyerUser: true },
      });
    },

    resolve: async (
      _: unknown,
      args: { orderId: string; winner: string }
    ) => {
      console.log(`Dispute resolved for order ${args.orderId}: winner = ${args.winner}`);
      return prisma.order.update({
        where: { id: args.orderId },
        data: { status: "RESOLVED" },
        include: { buyerUser: true },
      });
    },
  },
};
