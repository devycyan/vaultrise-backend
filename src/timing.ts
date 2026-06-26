/**
 * Scheduling helpers for the off-chain services. Keeping the background loops
 * out of phase (staggered start + per-tick jitter) and spacing per-item RPC
 * calls avoids bursting the RPC endpoint, which otherwise returns 429 Too Many
 * Requests (and the resulting retry delays cause stale-blockhash failures).
 */

/** Resolve after `ms` milliseconds. */
export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/**
 * Run `fn` on a loop: first after `initialDelayMs`, then repeatedly after the
 * base interval ± up to ~10% (capped 15s) random jitter. Self-scheduling — the
 * next run is queued only once the previous one settles, so slow cycles never
 * pile up. A distinct `initialDelayMs` per loop plus the per-tick jitter keep
 * independent loops from firing on the same instant.
 */
export function startJitteredLoop(
  intervalMs: number,
  fn: () => Promise<void>,
  initialDelayMs = 0
): void {
  const maxJitter = Math.min(intervalMs * 0.1, 15_000);
  const nextDelay = (): number => intervalMs + Math.round((Math.random() * 2 - 1) * maxJitter);
  const tick = (): void => {
    fn()
      .catch(() => {})
      .finally(() => setTimeout(tick, nextDelay()));
  };
  setTimeout(tick, initialDelayMs);
}
