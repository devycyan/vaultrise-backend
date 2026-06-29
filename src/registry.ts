/**
 * Collateral-token registry (the "eligible list"). Source of truth is PostgreSQL
 * (the CollateralToken table) so it survives restarts/redeploys on Railway.
 * Falls back to the bundled deployments/<cluster>.json only for local devnet
 * runs without a database.
 */
import { prisma } from "./db";
import { deploymentTokens, TokenInfo } from "./config";

let cache: { at: number; tokens: TokenInfo[] } | null = null;
const TTL_MS = 30_000;

function rowToToken(r: any): TokenInfo {
  return {
    symbol: r.symbol,
    mint: r.mint,
    decimals: r.decimals,
    price: r.price,
    pool: {
      source: (r.source as "pumpswap" | "meteora") || "pumpswap",
      authority: r.poolAddress,
      baseVault: r.baseVault,
      quoteVault: r.quoteVault,
      baseMint: r.baseMint,
      quoteMint: r.quoteMint,
      baseDecimals: r.baseDecimals,
      quoteDecimals: r.quoteDecimals,
    },
  };
}

/** Eligible collateral tokens, from Postgres (or the json fallback). Cached briefly. */
export async function loadTokens(): Promise<TokenInfo[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.tokens;
  let tokens: TokenInfo[];
  if (prisma) {
    // DB is the source of truth — empty table => no tokens (do NOT fall back to
    // the bundled devnet json, or devnet demo tokens would leak onto mainnet).
    try {
      const rows = await prisma.collateralToken.findMany({ where: { enabled: true } });
      tokens = rows.map(rowToToken);
    } catch (e: any) {
      console.warn("[registry] DB read failed:", e.message);
      tokens = [];
    }
  } else {
    // No database configured (local devnet) — fall back to the bundled file.
    tokens = deploymentTokens;
  }
  cache = { at: Date.now(), tokens };
  return tokens;
}

export function invalidateTokenCache(): void {
  cache = null;
}

export interface UpsertTokenInput {
  symbol: string;
  mint: string;
  decimals: number;
  tokenProgram: string;
  price: number;
  source?: "pumpswap" | "meteora";
  poolAddress: string;
  baseVault: string;
  quoteVault: string;
  baseMint: string;
  quoteMint: string;
  baseDecimals: number;
  quoteDecimals: number;
  enabled?: boolean;
}

/** Insert/update a collateral token in Postgres. Requires DATABASE_URL. */
export async function upsertToken(t: UpsertTokenInput): Promise<void> {
  if (!prisma) {
    throw new Error(
      "DATABASE_URL is not set — cannot persist the token registry. Point it at your Postgres (the backend reads tokens from there)."
    );
  }
  const data = { ...t, source: t.source ?? "pumpswap", enabled: t.enabled ?? true };
  await prisma.collateralToken.upsert({ where: { mint: t.mint }, create: data, update: data });
  invalidateTokenCache();
}
