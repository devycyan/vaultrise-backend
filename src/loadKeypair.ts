/**
 * Keypair loader. Accepts EITHER:
 *  - a base58-encoded secret key (preferred for deployments like Railway — set
 *    the secret as an env var, no .json file committed to the repo), or
 *  - a path to a JSON byte-array keypair file (kept for local dev; same guard as
 *    the contract: never from ~/.config/solana).
 *
 * The resulting Keypair is identical either way — only the source differs.
 */
import { utils } from "@coral-xyz/anchor";
import { Keypair } from "@solana/web3.js";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const bs58 = utils.bytes.bs58;

export function loadKeypair(value: string, label = "keypair"): Keypair {
  if (!value) throw new Error(`Missing ${label}`);
  const v = value.trim();

  // A file path contains a separator or ends in .json; otherwise treat the value
  // as a base58 secret (base58 never contains "/").
  const looksLikePath = v.endsWith(".json") || v.includes("/") || v.includes("\\");
  if (!looksLikePath) {
    let secret: Uint8Array;
    try {
      secret = bs58.decode(v);
    } catch {
      throw new Error(`${label}: value is neither a .json path nor a valid base58 secret key`);
    }
    if (secret.length !== 64) {
      throw new Error(`${label}: base58 secret must decode to 64 bytes (got ${secret.length})`);
    }
    return Keypair.fromSecretKey(secret);
  }

  const resolved = path.resolve(v);
  const forbidden = path.resolve(os.homedir(), ".config", "solana");
  if (resolved === forbidden || resolved.startsWith(forbidden + path.sep)) {
    throw new Error(`Refusing ${label} under ~/.config/solana: ${resolved}`);
  }
  if (!fs.existsSync(resolved)) throw new Error(`${label} not found: ${resolved}`);
  const secret = JSON.parse(fs.readFileSync(resolved, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}
