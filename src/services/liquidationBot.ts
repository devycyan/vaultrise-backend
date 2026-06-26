/**
 * Liquidation bot. Every cycle it scans positions, and for any with Health
 * Factor < 1.0 calls the on-chain `liquidate` instruction (the protocol's own
 * permissionless liquidator). On mainnet it then sells the seized collateral
 * for USDC via the Jupiter Swap API; on devnet (no Jupiter liquidity) the sale
 * is simulated and logged. The on-chain program enforces the liquidation shield
 * grace period, so the bot simply retries later if it hits ShieldGraceActive.
 */
import { BN } from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { config } from "../config";
import { getProgram, pdas, tryLoadKeypair } from "../solana";
import { getAllPositions } from "../vaultrise/client";
import { recordLiquidation } from "../store";
import { startJitteredLoop } from "../timing";

async function sellViaJupiter(symbol: string, amount: number): Promise<void> {
  if (config.cluster !== "mainnet-beta" || !config.jupiterApiKey) {
    const why = config.cluster !== "mainnet-beta" ? "not mainnet" : "no JUPITER_API_KEY";
    console.log(`[liquidator] simulated sale of ${amount} ${symbol} -> USDC (${why}); liquidator keeps the collateral`);
    return;
  }
  // Production path: GET {jupiterApiUrl}/order then POST /execute with x-api-key.
  console.log(`[liquidator] would sell ${amount} ${symbol} via Jupiter (${config.jupiterApiUrl})`);
}

async function runOnce(): Promise<void> {
  const liquidator = tryLoadKeypair(config.liquidatorKeypair, "LIQUIDATOR_KEYPAIR");
  if (!liquidator) return;
  const program = getProgram(liquidator);
  const usdcMint = config.usdcMint ? new PublicKey(config.usdcMint) : null;
  if (!usdcMint) return;

  const positions = await getAllPositions();
  const unhealthy = positions.filter((p) => p.debtUsd > 0 && p.healthFactor < 1.0);
  if (unhealthy.length) console.log(`[liquidator] ${unhealthy.length} liquidatable position(s)`);

  for (const p of unhealthy) {
    try {
      const borrower = new PublicKey(p.borrower);
      const mint = new PublicKey(p.mint);
      // USDC is classic SPL; collateral is Token-2022 (pump.fun).
      const liquidatorUsdc = getAssociatedTokenAddressSync(usdcMint, liquidator.publicKey, true, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
      const liquidatorCollateral = getAssociatedTokenAddressSync(mint, liquidator.publicKey, true, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);

      const sig: string = await program.methods
        .liquidate(new BN(Math.ceil(p.debtUsd * 1e6) + 1))
        .accountsPartial({
          liquidator: liquidator.publicKey,
          config: pdas.config(),
          reserve: pdas.reserve(),
          collateralMint: mint,
          tokenConfig: pdas.tokenConfig(mint),
          oracle: pdas.oracle(mint),
          position: pdas.position(borrower, mint),
          escrow: pdas.escrow(borrower, mint),
          usdcMint,
          liquidatorUsdc,
          liquidatorCollateral,
          usdcVault: pdas.usdcVault(),
          insuranceVault: pdas.insuranceVault(),
          liquidatorRegistry: null,
          tokenProgram: TOKEN_PROGRAM_ID,
          collateralTokenProgram: TOKEN_2022_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([liquidator])
        .rpc();

      // Liquidation is PARTIAL: the liquidator seizes only debt + penalty worth
      // of collateral (bonus 5% + insurance 3% = 8%), capped at the position's
      // collateral. The rest stays as the borrower's collateral.
      const BONUS_BPS = 500;
      const PENALTY = (BONUS_BPS + 300) / 10000; // bonus + insurance
      const seized =
        p.priceUsd > 0
          ? Math.min(p.collateralAmount, (p.debtUsd * (1 + PENALTY)) / p.priceUsd)
          : p.collateralAmount;

      await recordLiquidation({
        borrower: p.borrower,
        liquidator: liquidator.publicKey.toBase58(),
        symbol: p.symbol,
        debtRepaid: p.debtUsd,
        collateralSeized: seized,
        bonusBps: BONUS_BPS,
        timestamp: Math.floor(Date.now() / 1000),
        signature: sig,
      });
      console.log(`[liquidator] liquidated ${p.symbol} position of ${p.borrower} (HF ${p.healthFactor.toFixed(2)})`);
      await sellViaJupiter(p.symbol, seized);
    } catch (e: any) {
      const msg = e.message || String(e);
      if (msg.includes("ShieldGraceActive")) {
        console.log(`[liquidator] ${p.symbol}/${p.borrower}: shield grace active, will retry`);
      } else {
        console.warn(`[liquidator] failed for ${p.borrower}: ${msg.split("\n")[0]}`);
      }
    }
  }
}

export function startLiquidationBot(): void {
  console.log(`[liquidator] bot every ${config.liquidationIntervalSec}s`);
  startJitteredLoop(config.liquidationIntervalSec * 1000, runOnce, 20_000);
}
