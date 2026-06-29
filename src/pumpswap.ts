/**
 * Resolve a collateral token's market pool — PumpSwap (graduated pump.fun tokens,
 * WSOL-paired) or Meteora (DLMM / DAMM).
 *
 * Price and liquidity come from the free DexScreener API, which indexes BOTH
 * DEXes. PumpSwap pools are additionally decoded on-chain for their vault
 * accounts (legacy path); Meteora pools are referenced by their DexScreener pair
 * address and their liquidity is read from DexScreener (see client.getTokens), so
 * no Meteora-specific on-chain layout decoding is required. Liquidation auto-swap
 * is handled by Jupiter for either source.
 */
import { Connection, PublicKey } from "@solana/web3.js";

export const PUMPSWAP_PROGRAM = new PublicKey("pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA");
const WSOL = "So11111111111111111111111111111111111111112";
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
/** A pair quoted in WSOL/USDC reports a reliable USD price; non-canonical quotes
 *  can report a bogus priceUsd, so we always prefer canonical-quote pairs. */
const isCanonicalQuote = (q?: string): boolean => q === WSOL || q === USDC;

export type PoolSource = "pumpswap" | "meteora";

// Byte offsets inside the PumpSwap Pool account (verified against the on-chain IDL).
const OFF = { baseMint: 43, quoteMint: 75, baseVault: 139, quoteVault: 171 };
const pk = (buf: Buffer, off: number) => new PublicKey(buf.subarray(off, off + 32));

export interface PumpSwapPool {
  pool: PublicKey;
  baseMint: PublicKey;
  quoteMint: PublicKey;
  baseVault: PublicKey;
  quoteVault: PublicKey;
  symbol?: string;
  priceUsd?: number;
}

/**
 * Unified resolved-pool descriptor persisted in the registry. `baseVault`/
 * `quoteVault` are present for PumpSwap (decoded on-chain) and omitted for
 * Meteora (its liquidity is read via DexScreener, not the vault accounts).
 */
export interface ResolvedPool {
  source: PoolSource;
  pool: PublicKey;
  baseMint: PublicKey;
  quoteMint: PublicKey;
  baseVault?: PublicKey;
  quoteVault?: PublicKey;
  symbol?: string;
  priceUsd?: number;
}

/** Does a DexScreener pair's dexId belong to the given source? */
function dexMatches(dexId: string | undefined, source: PoolSource): boolean {
  const id = (dexId || "").toLowerCase();
  return source === "meteora" ? id.includes("meteora") : id.includes("pump");
}

export async function readPool(connection: Connection, pool: PublicKey): Promise<PumpSwapPool> {
  const info = await connection.getAccountInfo(pool);
  if (!info) throw new Error(`Pool ${pool.toBase58()} not found on-chain`);
  if (!info.owner.equals(PUMPSWAP_PROGRAM)) {
    throw new Error(`Account ${pool.toBase58()} is not a PumpSwap pool`);
  }
  const d = info.data;
  return {
    pool,
    baseMint: pk(d, OFF.baseMint),
    quoteMint: pk(d, OFF.quoteMint),
    baseVault: pk(d, OFF.baseVault),
    quoteVault: pk(d, OFF.quoteVault),
  };
}

/** Live USD price + liquidity for a token's market on the given DEX (DexScreener). */
export async function fetchDexMarket(
  mint: string,
  source: PoolSource = "pumpswap"
): Promise<{ priceUsd: number; liquidityUsd: number } | null> {
  try {
    const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
    if (!r.ok) return null;
    const d = (await r.json()) as { pairs?: any[] };
    const pairs = (d.pairs || []).filter((p) => dexMatches(p.dexId, source));
    if (!pairs.length) return null;
    pairs.sort((a, b) => {
      const ac = isCanonicalQuote(a.quoteToken?.address) ? 1 : 0;
      const bc = isCanonicalQuote(b.quoteToken?.address) ? 1 : 0;
      if (ac !== bc) return bc - ac;
      return (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0);
    });
    const p = pairs[0];
    return {
      priceUsd: p.priceUsd ? parseFloat(p.priceUsd) : 0,
      liquidityUsd: p.liquidity?.usd || 0,
    };
  } catch {
    return null;
  }
}

/**
 * Batched DexScreener price + USD liquidity keyed by token mint. Picks the
 * deepest pair per token (source-agnostic — that is the liquidity a liquidation
 * would actually route through). One HTTP call per 30 mints. Used for the
 * borrow-eligibility LP gate so it works for PumpSwap and Meteora alike.
 */
export async function fetchDexLiquidityBatch(
  mints: string[]
): Promise<Record<string, { priceUsd: number; liquidityUsd: number }>> {
  // Prefer a canonical (WSOL/USDC-quoted) pair so priceUsd is reliable; among
  // equals, take the deepest. A non-canonical "deepest" pair can report a bogus
  // USD price, so canonical wins even if shallower.
  const best: Record<string, { priceUsd: number; liquidityUsd: number; canonical: boolean }> = {};
  if (!mints.length) return {};
  try {
    for (let i = 0; i < mints.length; i += 30) {
      const chunk = mints.slice(i, i + 30);
      const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${chunk.join(",")}`);
      if (!r.ok) continue;
      const d = (await r.json()) as { pairs?: any[] };
      for (const p of d.pairs || []) {
        const mint = p.baseToken?.address as string | undefined;
        if (!mint) continue;
        const cand = {
          priceUsd: p.priceUsd ? parseFloat(p.priceUsd) : 0,
          liquidityUsd: p.liquidity?.usd || 0,
          canonical: isCanonicalQuote(p.quoteToken?.address),
        };
        const prev = best[mint];
        const better =
          !prev ||
          (cand.canonical && !prev.canonical) ||
          (cand.canonical === prev.canonical && cand.liquidityUsd > prev.liquidityUsd);
        if (better) best[mint] = cand;
      }
    }
  } catch {
    /* best-effort; callers tolerate missing entries */
  }
  const out: Record<string, { priceUsd: number; liquidityUsd: number }> = {};
  for (const m of Object.keys(best)) out[m] = { priceUsd: best[m].priceUsd, liquidityUsd: best[m].liquidityUsd };
  return out;
}

export async function resolvePumpSwapPool(
  connection: Connection,
  mint: PublicKey
): Promise<ResolvedPool> {
  const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint.toBase58()}`);
  if (!res.ok) throw new Error(`DexScreener lookup failed (${res.status})`);
  const data = (await res.json()) as { pairs?: any[] };
  const pumpPairs = (data.pairs || []).filter((p) => dexMatches(p.dexId, "pumpswap"));
  if (!pumpPairs.length) {
    throw new Error(
      `No PumpSwap pool found for ${mint.toBase58()} — is the token graduated and indexed yet? Pass the pool address, or use "meteora".`
    );
  }
  pumpPairs.sort((a, b) => {
    const aw = a.quoteToken?.address === WSOL ? 1 : 0;
    const bw = b.quoteToken?.address === WSOL ? 1 : 0;
    if (aw !== bw) return bw - aw;
    return (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0);
  });
  const chosen = pumpPairs[0];

  const decoded = await readPool(connection, new PublicKey(chosen.pairAddress));
  if (!decoded.baseMint.equals(mint)) {
    throw new Error(`Resolved pool base mint ${decoded.baseMint.toBase58()} != ${mint.toBase58()}`);
  }
  return {
    source: "pumpswap",
    ...decoded,
    symbol: chosen.baseToken?.symbol,
    priceUsd: chosen.priceUsd ? parseFloat(chosen.priceUsd) : undefined,
  };
}

/**
 * Resolve a token's Meteora pool (DLMM / DAMM) via DexScreener. The pool is
 * referenced by its DexScreener pair address; liquidity is read from DexScreener
 * (no Meteora on-chain layout decoding needed), and Jupiter handles the swap.
 */
export async function resolveMeteoraPool(
  _connection: Connection,
  mint: PublicKey
): Promise<ResolvedPool> {
  const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint.toBase58()}`);
  if (!res.ok) throw new Error(`DexScreener lookup failed (${res.status})`);
  const data = (await res.json()) as { pairs?: any[] };
  const pairs = (data.pairs || []).filter(
    (p) => dexMatches(p.dexId, "meteora") && p.baseToken?.address === mint.toBase58()
  );
  if (!pairs.length) {
    throw new Error(
      `No Meteora pool found for ${mint.toBase58()} (with the token as base). Is it indexed on DexScreener yet?`
    );
  }
  pairs.sort((a, b) => {
    const aw = a.quoteToken?.address === WSOL ? 1 : 0;
    const bw = b.quoteToken?.address === WSOL ? 1 : 0;
    if (aw !== bw) return bw - aw;
    return (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0);
  });
  const chosen = pairs[0];
  return {
    source: "meteora",
    pool: new PublicKey(chosen.pairAddress),
    baseMint: mint,
    quoteMint: new PublicKey(chosen.quoteToken.address),
    symbol: chosen.baseToken?.symbol,
    priceUsd: chosen.priceUsd ? parseFloat(chosen.priceUsd) : undefined,
  };
}
