import { PrismaClient } from "@prisma/client";

/**
 * Singleton PrismaClient (pola resmi Prisma untuk Next.js dev hot-reload):
 * https://www.prisma.io/docs/orm/more/help-and-troubleshooting/nextjs-help#best-practice
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
