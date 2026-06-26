/**
 * LP-concentration monitor. Periodically checks how concentrated each token's
 * holdings are among the top-3 accounts (a proxy for PumpSwap LP concentration).
 * If the top-3 control > 60% it flips the on-chain `lp_blocked` flag so no new
 * positions can open against that token.
 *
 * On devnet the mock setup mints most supply to the admin, which would trip the
 * threshold and break the demo, so blocking is only enforced on mainnet; on
 * devnet the concentration is computed and logged only.
 */
import { PublicKey } from "@solana/web3.js";
import { config } from "../config";
import { connection, getProgram, pdas, tryLoadKeypair } from "../solana";
import { startJitteredLoop } from "../timing";

const CONCENTRATION_LIMIT = 0.6;

async function topThreeShare(mint: PublicKey): Promise<number> {
  try {
    const largest = await connection.getTokenLargestAccounts(mint);
    const supply = await connection.getTokenSupply(mint);
    const total = Number(supply.value.amount);
    if (total <= 0) return 0;
    const top3 = largest.value.slice(0, 3).reduce((a, x) => a + Number(x.amount), 0);
    return top3 / total;
  } catch {
    return 0;
  }
}

async function runOnce(): Promise<void> {
  if (!config.tokens.length) return;
  const updater = tryLoadKeypair(config.oracleUpdaterKeypair, "ORACLE_UPDATER_KEYPAIR");
  const program = updater ? getProgram(updater) : null;

  for (const t of config.tokens) {
    const share = await topThreeShare(new PublicKey(t.mint));
    const concentrated = share > CONCENTRATION_LIMIT;
    const tag = `${t.symbol} top-3=${(share * 100).toFixed(1)}%`;

    if (concentrated && config.cluster === "mainnet-beta" && program && updater) {
      try {
        await program.methods
          .setLpBlocked(true)
          .accountsPartial({ signer: updater.publicKey, config: pdas.config(), tokenConfig: pdas.tokenConfig(new PublicKey(t.mint)) })
          .signers([updater])
          .rpc();
        console.warn(`[lp] ${tag} > 60% — blocked new positions`);
      } catch (e: any) {
        console.warn(`[lp] ${tag} block failed: ${e.message}`);
      }
    } else {
      console.log(`[lp] ${tag}${concentrated ? " (would block on mainnet)" : ""}`);
    }
  }
}

export function startLpChecker(): void {
  if (!config.tokens.length) return;
  console.log(`[lp] concentration checker every ${config.lpCheckIntervalSec}s`);
  startJitteredLoop(config.lpCheckIntervalSec * 1000, runOnce, 40_000);
}
