/**
 * Prisma (PostgreSQL) client. Constructed only when DATABASE_URL is set; callers
 * fall back to in-memory storage otherwise so the backend still runs without a
 * database (e.g. local dev / devnet smoke tests).
 */
import { PrismaClient } from "@prisma/client";
import { config } from "./config";

export const prisma: PrismaClient | null = config.databaseUrl ? new PrismaClient() : null;

if (prisma) {
  console.log("[db] PostgreSQL (Prisma) enabled");
} else {
  console.log("[db] no DATABASE_URL set — using in-memory storage (data resets on restart)");
}
