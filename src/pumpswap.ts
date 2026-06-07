/**
 * Resolve a token's PumpSwap pool from its mint.
 *
 * Graduated pump.fun tokens are paired with WSOL on PumpSwap. getProgramAccounts
 * is blocked by most RPC tiers for the huge PumpSwap program and the pool PDA
 * isn't reliably derivable, so we look the pool up via the free DexScreener API
 * and verify/decode the pool account on-chain.
 */
import { Connection, PublicKey } from "@solana/web3.js";

export const PUMPSWAP_PROGRAM = new PublicKey("pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA");
const WSOL = "So11111111111111111111111111111111111111112";

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

/** Live USD price + liquidity for a token's PumpSwap market (DexScreener). */
export async function fetchDexMarket(
  mint: string
): Promise<{ priceUsd: number; liquidityUsd: number } | null> {
  try {
    const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
    if (!r.ok) return null;
    const d = (await r.json()) as { pairs?: any[] };
    const pairs = (d.pairs || []).filter((p) => /pump/i.test(p.dexId || ""));
    if (!pairs.length) return null;
    pairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
    const p = pairs[0];
    return {
      priceUsd: p.priceUsd ? parseFloat(p.priceUsd) : 0,
      liquidityUsd: p.liquidity?.usd || 0,
    };
  } catch {
    return null;
  }
}

export async function resolvePumpSwapPool(
  connection: Connection,
  mint: PublicKey
): Promise<PumpSwapPool> {
  const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint.toBase58()}`);
  if (!res.ok) throw new Error(`DexScreener lookup failed (${res.status})`);
  const data = (await res.json()) as { pairs?: any[] };
  const pumpPairs = (data.pairs || []).filter((p) => /pump/i.test(p.dexId || ""));
  if (!pumpPairs.length) {
    throw new Error(
      `No PumpSwap pool found for ${mint.toBase58()} — is the token graduated and indexed yet? You can pass the pool address manually instead of "auto".`
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
    ...decoded,
    symbol: chosen.baseToken?.symbol,
    priceUsd: chosen.priceUsd ? parseFloat(chosen.priceUsd) : undefined,
  };
}
