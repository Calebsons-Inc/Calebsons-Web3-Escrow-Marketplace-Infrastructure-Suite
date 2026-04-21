import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const userResolvers = {
  Query: {
    users: async () => {
      return prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        include: { orders: true },
      });
    },

    user: async (_: unknown, args: { address: string }) => {
      return prisma.user.findUnique({
        where: { address: args.address },
        include: { orders: true },
      });
    },
  },

  Mutation: {
    upsertUser: async (_: unknown, args: { address: string }) => {
      return prisma.user.upsert({
        where: { address: args.address },
        update: {},
        create: { address: args.address },
        include: { orders: true },
      });
    },
  },
};
