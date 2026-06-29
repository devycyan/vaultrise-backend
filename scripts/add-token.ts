/**
 * Register a graduated pump.fun token as eligible collateral.
 *
 *   npm run add-token -- <MINT> <maxLtvBps> <POOL|auto|meteora> [priceUsd]
 *   e.g. npm run add-token -- 7xKq...mint 2000 auto 0.0005      (PumpSwap, auto-resolve)
 *        npm run add-token -- 7xKq...mint 2000 meteora 0.0005   (Meteora DLMM/DAMM)
 *
 * Sends `add_token` on-chain (admin) AND persists the token to PostgreSQL so the
 * API/frontend list it — survives restarts/redeploys (Railway). Re-running just
 * refreshes the DB row. Run locally with DATABASE_URL pointed at the SAME
 * Postgres the backend uses (e.g. the Railway DB's public URL).
 *
 * - maxLtvBps: 2000 = 20% (bps; NOT 20).
 * - POOL: "auto" (PumpSwap, resolved from the mint), "meteora" (Meteora DLMM/DAMM,
 *   resolved from the mint), or an explicit PumpSwap pool address.
 * - priceUsd: USD price per 1 whole token (DexScreener "Price USD"). Seeds the
 *   on-chain oracle (needs a funded ORACLE_UPDATER). Keys only from wallets/.
 */
import { BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { config } from "../src/config";
import { loadKeypair } from "../src/loadKeypair";
import { connection, getProgram, pdas } from "../src/solana";
import { readPool, resolveMeteoraPool, resolvePumpSwapPool, ResolvedPool } from "../src/pumpswap";
import { upsertToken } from "../src/registry";

async function mintInfo(mint: PublicKey) {
  const acc = await connection.getParsedAccountInfo(mint);
  const info = (acc.value?.data as any)?.parsed?.info;
  if (!info) throw new Error(`Mint ${mint.toBase58()} not found / not a token mint`);
  return { decimals: info.decimals as number, program: acc.value!.owner.toBase58() as string };
}

async function main() {
  const [mintArg, ltvArg, poolArg, priceArg] = process.argv.slice(2);
  if (!mintArg || !ltvArg || !poolArg) {
    throw new Error('Usage: npm run add-token -- <MINT> <maxLtvBps> <POOL|auto|meteora> [priceUsd]');
  }
  const mint = new PublicKey(mintArg);
  const maxLtvBps = Number(ltvArg);
  if (!Number.isInteger(maxLtvBps) || maxLtvBps <= 0 || maxLtvBps > 10000) {
    throw new Error("maxLtvBps must be an integer in (0, 10000]. 20% = 2000 (not 20).");
  }

  const pa = poolArg.toLowerCase();
  const poolData: ResolvedPool =
    pa === "auto"
      ? await resolvePumpSwapPool(connection, mint)
      : pa === "meteora"
        ? await resolveMeteoraPool(connection, mint)
        : { source: "pumpswap", ...(await readPool(connection, new PublicKey(poolArg))) };
  console.log(`Pool [${poolData.source}]: ${poolData.pool.toBase58()} (quote ${poolData.quoteMint.toBase58()})`);

  const base = await mintInfo(mint);
  const quote = await mintInfo(poolData.quoteMint);

  const admin = loadKeypair(config.adminKeypair, "ADMIN_KEYPAIR");
  const program = getProgram(admin);

  try {
    console.log(`Registering ${mint.toBase58()} (maxLTV ${maxLtvBps} bps) on ${config.programId}…`);
    await program.methods
      .addToken(maxLtvBps, poolData.pool, 0)
      .accountsPartial({
        authority: admin.publicKey,
        config: pdas.config(),
        mint,
        tokenConfig: pdas.tokenConfig(mint),
        oracle: pdas.oracle(mint),
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log("Token registered on-chain.");
  } catch (e: any) {
    const msg = e.message || String(e);
    if (/already in use|already been processed|0x0\b/i.test(msg)) {
      console.log("Token already registered on-chain — refreshing DB. (Use `npm run update-token` to change LTV.)");
    } else {
      throw e;
    }
  }

  const priceUsd = priceArg ? parseFloat(priceArg) : poolData.priceUsd ?? 0;
  if (priceArg) {
    // Best-effort: a price-seed failure (e.g. unfunded oracle-updater) must not
    // block persisting the token to the registry.
    try {
      const oracle = loadKeypair(config.oracleUpdaterKeypair, "ORACLE_UPDATER_KEYPAIR");
      await getProgram(oracle)
        .methods.updatePrice(new BN(Math.round(parseFloat(priceArg) * 1e6)))
        .accountsPartial({ updater: oracle.publicKey, config: pdas.config(), oracle: pdas.oracle(mint) })
        .signers([oracle])
        .rpc();
      console.log(`Seeded oracle price: $${priceArg}`);
    } catch (e: any) {
      console.warn(
        `Price seed FAILED (${(e.message || String(e)).split("\n")[0]}). Saving token without an oracle price — fund ORACLE_UPDATER and re-run, or let the TWAP bot set it.`
      );
    }
  } else {
    console.log("No priceUsd passed — oracle NOT seeded (token shows $0 until a price is set).");
  }

  await upsertToken({
    symbol: poolData.symbol || mint.toBase58().slice(0, 4),
    mint: mint.toBase58(),
    decimals: base.decimals,
    tokenProgram: base.program,
    price: priceUsd,
    source: poolData.source,
    poolAddress: poolData.pool.toBase58(),
    // Vaults exist only for PumpSwap; Meteora liquidity is read via DexScreener.
    baseVault: poolData.baseVault?.toBase58() ?? "",
    quoteVault: poolData.quoteVault?.toBase58() ?? "",
    baseMint: poolData.baseMint.toBase58(),
    quoteMint: poolData.quoteMint.toBase58(),
    baseDecimals: base.decimals,
    quoteDecimals: quote.decimals,
  });
  console.log("Saved to Postgres — the backend will list it (token cache refreshes within ~30s).");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
