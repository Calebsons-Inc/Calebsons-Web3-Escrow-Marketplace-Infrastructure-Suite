import type { PrismaClient } from "@prisma/client";

interface Context {
  prisma: PrismaClient;
}

export const orderResolvers = {
  Query: {
    orders: async (
      _: unknown,
      args: { status?: string; buyer?: string; seller?: string },
      context: Context
    ) => {
      const where: Record<string, unknown> = {};
      if (args.status) where.status = args.status;
      if (args.buyer) where.buyer = args.buyer;
      if (args.seller) where.seller = args.seller;
      return context.prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: { buyerUser: true },
      });
    },

    order: async (_: unknown, args: { id: string }, context: Context) => {
      return context.prisma.order.findUnique({
        where: { id: args.id },
        include: { buyerUser: true },
      });
    },

    orderByChainId: async (_: unknown, args: { onChainId: number }, context: Context) => {
      return context.prisma.order.findUnique({
        where: { onChainId: args.onChainId },
        include: { buyerUser: true },
      });
    },
  },

  Mutation: {
    createOrder: async (
      _: unknown,
      args: { buyer: string; seller: string; amount: string },
      context: Context
    ) => {
      // Ensure buyer user exists
      await context.prisma.user.upsert({
        where: { address: args.buyer },
        update: {},
        create: { address: args.buyer },
      });

      const latestOrder = await context.prisma.order.findFirst({
        orderBy: { onChainId: "desc" },
      });
      const nextOnChainId = (latestOrder?.onChainId ?? 0) + 1;

      const order = await context.prisma.order.create({
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
      args: { orderId: string; txHash: string; blockNumber?: number },
      context: Context
    ) => {
      return context.prisma.order.update({
        where: { id: args.orderId },
        data: {
          status: "FUNDED",
          txHash: args.txHash,
          blockNumber: args.blockNumber,
        },
        include: { buyerUser: true },
      });
    },

    fulfill: async (_: unknown, args: { orderId: string }, context: Context) => {
      return context.prisma.order.update({
        where: { id: args.orderId },
        data: { status: "FULFILLED" },
        include: { buyerUser: true },
      });
    },

    release: async (_: unknown, args: { orderId: string }, context: Context) => {
      return context.prisma.order.update({
        where: { id: args.orderId },
        data: { status: "RELEASED" },
        include: { buyerUser: true },
      });
    },

    dispute: async (_: unknown, args: { orderId: string }, context: Context) => {
      return context.prisma.order.update({
        where: { id: args.orderId },
        data: { status: "DISPUTED" },
        include: { buyerUser: true },
      });
    },

    resolve: async (
      _: unknown,
      args: { orderId: string; winner: string },
      context: Context
    ) => {
      console.log(`Dispute resolved for order ${args.orderId}: winner = ${args.winner}`);
      return context.prisma.order.update({
        where: { id: args.orderId },
        data: { status: "RESOLVED" },
        include: { buyerUser: true },
      });
    },
  },
};
