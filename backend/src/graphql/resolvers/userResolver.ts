import type { PrismaClient } from "@prisma/client";

interface Context {
  prisma: PrismaClient;
}

export const userResolvers = {
  Query: {
    users: async (_: unknown, __: unknown, context: Context) => {
      return context.prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        include: { orders: true },
      });
    },

    user: async (_: unknown, args: { address: string }, context: Context) => {
      return context.prisma.user.findUnique({
        where: { address: args.address },
        include: { orders: true },
      });
    },
  },

  Mutation: {
    upsertUser: async (_: unknown, args: { address: string }, context: Context) => {
      return context.prisma.user.upsert({
        where: { address: args.address },
        update: {},
        create: { address: args.address },
        include: { orders: true },
      });
    },
  },
};
