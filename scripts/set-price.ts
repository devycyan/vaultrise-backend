/**
 * Manually push an oracle price for a collateral token (signed by ORACLE_UPDATER).
 * Useful for testing liquidations: set a price, then "crash" it to drop the
 * Health Factor below 1.0. Disable the TWAP bot (TWAP_ENABLED=false) first, or it
 * will overwrite your manual price on its next cycle.
 *
 *   npm run set-price -- <MINT> <priceUsd>
 *   e.g. npm run set-price -- SPCX...69 0.0012   (price per 1 whole token, USD)
 */
import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { config } from "../src/config";
import { loadKeypair } from "../src/loadKeypair";
import { getProgram, pdas } from "../src/solana";

async function main() {
  const [mintArg, priceArg] = process.argv.slice(2);
  if (!mintArg || !priceArg) {
    throw new Error("Usage: npm run set-price -- <MINT> <priceUsd>");
  }
  const mint = new PublicKey(mintArg);
  const price = new BN(Math.round(parseFloat(priceArg) * 1e6)); // USDC 6dp per whole token

  const oracle = loadKeypair(config.oracleUpdaterKeypair, "ORACLE_UPDATER_KEYPAIR");
  console.log(`Setting oracle price for ${mint.toBase58()} = $${priceArg}`);
  await getProgram(oracle)
    .methods.updatePrice(price)
    .accountsPartial({ updater: oracle.publicKey, config: pdas.config(), oracle: pdas.oracle(mint) })
    .signers([oracle])
    .rpc();
  console.log("Oracle price updated.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
