/**
 * Update an existing collateral token (admin tx): change max LTV / enable-disable.
 *   npm run update-token -- <MINT> <maxLtvBps> [enabled]
 *   e.g. npm run update-token -- 7xKq...mint 2000         (enable @ 20% LTV)
 *        npm run update-token -- 7xKq...mint 2000 false   (disable)
 *
 * Updates the program on-chain AND the Postgres registry. maxLtvBps: 2000 = 20%.
 */
import { PublicKey } from "@solana/web3.js";
import { config } from "../src/config";
import { loadKeypair } from "../src/loadKeypair";
import { getProgram, pdas } from "../src/solana";
import { prisma } from "../src/db";
import { invalidateTokenCache } from "../src/registry";

async function main() {
  const [mintArg, ltvArg, enabledArg] = process.argv.slice(2);
  if (!mintArg || !ltvArg) {
    throw new Error("Usage: npm run update-token -- <MINT> <maxLtvBps> [enabled]");
  }
  const mint = new PublicKey(mintArg);
  const maxLtvBps = Number(ltvArg);
  if (!Number.isInteger(maxLtvBps) || maxLtvBps <= 0 || maxLtvBps > 10000) {
    throw new Error("maxLtvBps must be an integer in (0, 10000]. 20% = 2000 (not 20).");
  }
  const enabled = enabledArg ? !["false", "0", "no"].includes(enabledArg.toLowerCase()) : true;

  const admin = loadKeypair(config.adminKeypair, "ADMIN_KEYPAIR");
  const program = getProgram(admin);

  console.log(`Updating ${mint.toBase58()}: enabled=${enabled}, maxLTV=${maxLtvBps} bps on ${config.programId}`);
  await program.methods
    .updateToken(enabled, maxLtvBps)
    .accountsPartial({ authority: admin.publicKey, config: pdas.config(), tokenConfig: pdas.tokenConfig(mint) })
    .rpc();
  console.log("Updated on-chain.");

  if (prisma) {
    await prisma.collateralToken.updateMany({ where: { mint: mint.toBase58() }, data: { enabled } });
    invalidateTokenCache();
    console.log("Updated DB (enabled flag).");
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
