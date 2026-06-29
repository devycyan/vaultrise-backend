/**
 * Liquidation feed storage. Backed by PostgreSQL (Prisma) when DATABASE_URL is
 * set so it survives restarts; otherwise an in-memory ring buffer is used.
 */
import { prisma } from "./db";

export interface LiquidationEntry {
  borrower: string;
  liquidator: string;
  symbol: string;
  debtRepaid: number;
  collateralSeized: number;
  bonusBps: number;
  timestamp: number;
  signature?: string;
}

// In-memory fallback (used only when Postgres is not configured / unreachable).
const mem: LiquidationEntry[] = [];

export async function recordLiquidation(entry: LiquidationEntry): Promise<void> {
  if (prisma) {
    try {
      await prisma.liquidation.create({ data: { ...entry, signature: entry.signature ?? null } });
      return;
    } catch (e: any) {
      console.warn("[store] DB write failed, falling back to memory:", e.message);
    }
  }
  mem.unshift(entry);
  if (mem.length > 100) mem.pop();
}

export async function getLiquidationFeed(limit = 20): Promise<LiquidationEntry[]> {
  if (prisma) {
    try {
      const rows = await prisma.liquidation.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return rows.map((r) => ({
        borrower: r.borrower,
        liquidator: r.liquidator,
        symbol: r.symbol,
        debtRepaid: r.debtRepaid,
        collateralSeized: r.collateralSeized,
        bonusBps: r.bonusBps,
        timestamp: r.timestamp,
        signature: r.signature ?? undefined,
      }));
    } catch (e: any) {
      console.warn("[store] DB read failed, falling back to memory:", e.message);
    }
  }
  return mem.slice(0, limit);
}

/** Optional: persist an oracle price sample (no-op without Postgres). */
export async function recordPriceSample(mint: string, symbol: string, price: number): Promise<void> {
  if (!prisma) return;
  try {
    await prisma.priceSample.create({ data: { mint, symbol, price } });
  } catch {
    /* best-effort history; ignore */
  }
}

// --- Telegram alert subscriptions (wallet -> telegram chat id) ---------------
// In-memory fallback (used only when Postgres is not configured / unreachable).
const subs = new Map<string, string>();

export async function upsertSubscription(wallet: string, telegramId: string): Promise<void> {
  if (prisma) {
    try {
      await prisma.alertSubscription.upsert({
        where: { wallet },
        create: { wallet, telegramId },
        update: { telegramId },
      });
      return;
    } catch (e: any) {
      console.warn("[store] subscription DB write failed, using memory:", e.message);
    }
  }
  subs.set(wallet, telegramId);
}

export async function getSubscription(wallet: string): Promise<string | null> {
  if (prisma) {
    try {
      const row = await prisma.alertSubscription.findUnique({ where: { wallet } });
      return row?.telegramId ?? null;
    } catch (e: any) {
      console.warn("[store] subscription DB read failed, using memory:", e.message);
    }
  }
  return subs.get(wallet) ?? null;
}
