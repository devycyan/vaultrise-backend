/**
 * Shared Solana connection, Anchor program, and PDA helpers for the backend.
 * Reads use an ephemeral wallet; writes (price updates, liquidations) use the
 * repo-local service keypairs.
 */
import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { config } from "./config";
import { loadKeypair } from "./loadKeypair";
import { makePdas } from "./vaultrise/pdas";
import idl from "./vaultrise/idl/vaultrise.json";

export const connection = new Connection(config.rpcUrl, "confirmed");
export const programId = new PublicKey(config.programId);
export const pdas = makePdas(programId);

// Returns `any` so callers can use program.account.* / program.methods.* without
// the generic Program<Idl> namespace typing friction.
export function getProgram(wallet: Keypair): any {
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(wallet), {
    commitment: "confirmed",
  });
  return new anchor.Program(idl as any, provider);
}

/** Program instance for read-only account fetches. */
export const readProgram = getProgram(Keypair.generate());

/** Try to load a service keypair; returns null (with a warning) if unavailable. */
export function tryLoadKeypair(path: string, label: string): Keypair | null {
  try {
    return loadKeypair(path, label);
  } catch (e: any) {
    console.warn(`[solana] ${label} unavailable: ${e.message}`);
    return null;
  }
}

export { anchor };
