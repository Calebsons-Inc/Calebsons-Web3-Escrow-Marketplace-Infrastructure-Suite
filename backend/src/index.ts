import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { readFileSync } from "fs";
import { join } from "path";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import { orderResolvers } from "./graphql/resolvers/orderResolver";
import { userResolvers } from "./graphql/resolvers/userResolver";
import { escrowResolvers } from "./graphql/resolvers/escrowResolver";

dotenv.config();

const prisma = new PrismaClient();

const typeDefs = readFileSync(
  join(__dirname, "./graphql/schema.graphql"),
  "utf-8"
);

const resolvers = {
  Query: {
    ...orderResolvers.Query,
    ...userResolvers.Query,
    ...escrowResolvers.Query,
  },
  Mutation: {
    ...orderResolvers.Mutation,
    ...userResolvers.Mutation,
  },
};

async function startServer() {
  const app = express();

  app.use(
    cors({
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      credentials: true,
    })
  );
  app.use(bodyParser.json());

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: true,
  });

  await server.start();

  app.use(
    "/graphql",
    expressMiddleware(server, {
      context: async ({ req }) => ({
        prisma,
        req,
      }),
    })
  );

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  const PORT = parseInt(process.env.PORT || "4000", 10);

  await prisma.$connect();
  console.log("Connected to database");

  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}/graphql`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
