import { PublicKey } from "@solana/web3.js";

const seed = (s: string) => Buffer.from(s);

export function makePdas(programId: PublicKey) {
  return {
    config: () => PublicKey.findProgramAddressSync([seed("config")], programId)[0],
    reserve: () => PublicKey.findProgramAddressSync([seed("reserve")], programId)[0],
    gusdcMint: () => PublicKey.findProgramAddressSync([seed("gusdc_mint")], programId)[0],
    usdcVault: () => PublicKey.findProgramAddressSync([seed("usdc_vault")], programId)[0],
    insuranceVault: () =>
      PublicKey.findProgramAddressSync([seed("insurance_vault")], programId)[0],
    tokenConfig: (mint: PublicKey) =>
      PublicKey.findProgramAddressSync([seed("token"), mint.toBuffer()], programId)[0],
    oracle: (mint: PublicKey) =>
      PublicKey.findProgramAddressSync([seed("oracle"), mint.toBuffer()], programId)[0],
    position: (borrower: PublicKey, mint: PublicKey) =>
      PublicKey.findProgramAddressSync(
        [seed("position"), borrower.toBuffer(), mint.toBuffer()],
        programId
      )[0],
    escrow: (borrower: PublicKey, mint: PublicKey) =>
      PublicKey.findProgramAddressSync(
        [seed("escrow"), borrower.toBuffer(), mint.toBuffer()],
        programId
      )[0],
    liquidator: (liq: PublicKey) =>
      PublicKey.findProgramAddressSync([seed("liquidator"), liq.toBuffer()], programId)[0],
  };
}
