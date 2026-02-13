import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

function createPrismaClient() {
  // Use DATABASE_URL first, then fall back to POSTGRES_URL
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error("Database connection string not found. Set POSTGRES_URL or DATABASE_URL.");
  }
  const pool = globalForPrisma.pool ?? new Pool({ connectionString });
  globalForPrisma.pool = pool;
  
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ 
    adapter,
    log: process.env.NODE_ENV === "development"
      ? ["query", "error", "warn"]
      : ["error"],
  });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
