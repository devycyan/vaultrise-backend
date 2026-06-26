/**
 * TWAP aggregator. Periodically reads each token's USD price, maintains a
 * 30-minute rolling average, and pushes it to the on-chain oracle.
 *
 * Price source: DexScreener's USD price for the token's PumpSwap market. We use
 * the ready USD price (not raw pool reserves) because real PumpSwap pools are
 * quoted in WSOL — deriving USD from reserves would require a separate SOL/USD
 * feed and exact decimals. This keeps the pushed price correct in USD.
 *
 * Disable with TWAP_ENABLED=false (e.g. to hold a manually-set price while
 * testing liquidations).
 */
import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { cacheGet, cacheSet } from "../cache";
import { config } from "../config";
import { fetchDexMarket } from "../pumpswap";
import { loadTokens } from "../registry";
import { getProgram, pdas, tryLoadKeypair } from "../solana";
import { sleep, startJitteredLoop } from "../timing";

const WINDOW_MS = 30 * 60 * 1000; // 30 minutes
const DEVIATION_UP_BPS = 2500; // spot > TWAP+25% => clamp to TWAP for LTV safety

interface Sample {
  ts: number;
  price: number; // USDC base units (6dp) per whole token
}

async function runOnce(): Promise<void> {
  const oracle = tryLoadKeypair(config.oracleUpdaterKeypair, "ORACLE_UPDATER_KEYPAIR");
  if (!oracle) return;
  const tokens = await loadTokens();
  if (!tokens.length) return;
  const program = getProgram(oracle);
  const now = Date.now();

  let firstToken = true;
  for (const t of tokens) {
    // Space out per-token on-chain pushes so we don't burst the RPC (429s).
    if (!firstToken) await sleep(300 + Math.floor(Math.random() * 500)); // 300–800ms
    firstToken = false;
    try {
      const market = await fetchDexMarket(t.mint);
      if (!market || market.priceUsd <= 0) continue;
      if (market.liquidityUsd < config.twapMinLpUsd) {
        console.warn(
          `[twap] ${t.symbol} LP $${market.liquidityUsd.toFixed(0)} < $${config.twapMinLpUsd} — skipping (unhedgeable)`
        );
        continue;
      }

      const spot = Math.round(market.priceUsd * 1e6); // USDC 6dp per whole token
      const key = `twap:${t.mint}`;
      const samples = (await cacheGet<Sample[]>(key)) || [];
      samples.push({ ts: now, price: spot });
      const windowed = samples.filter((s) => s.ts >= now - WINDOW_MS);
      const twap = Math.round(windowed.reduce((a, s) => a + s.price, 0) / windowed.length);
      await cacheSet(key, windowed, 3600);

      // Deviation guard: never let an inflated spot raise the LTV price.
      const maxAllowed = Math.round((twap * (10000 + DEVIATION_UP_BPS)) / 10000);
      const pushPrice = Math.min(spot, maxAllowed, twap);

      await program.methods
        .updatePrice(new BN(pushPrice))
        .accountsPartial({ updater: oracle.publicKey, config: pdas.config(), oracle: pdas.oracle(new PublicKey(t.mint)) })
        .signers([oracle])
        .rpc();

      await cacheSet(`price:${t.mint}`, { price: pushPrice, ts: now }, 3600);
      console.log(`[twap] ${t.symbol} spot=$${(spot / 1e6).toFixed(6)} twap=$${(twap / 1e6).toFixed(6)}`);
    } catch (e: any) {
      console.warn(`[twap] ${t.symbol} update failed: ${e.message}`);
    }
  }
}

export function startTwapAggregator(): void {
  if (!config.twapEnabled) {
    console.log("[twap] disabled (TWAP_ENABLED=false) — oracle prices left as set manually");
    return;
  }
  // Tokens come from the DB registry (added at runtime), so always start the
  // loop; runOnce() is a no-op while there are no tokens.
  console.log(`[twap] aggregator every ${config.twapIntervalSec}s`);
  // Staggered start (+jitter) so TWAP, liquidation and LP loops don't all fire
  // on the same tick and burst the RPC.
  startJitteredLoop(config.twapIntervalSec * 1000, runOnce, 2_000);
}
