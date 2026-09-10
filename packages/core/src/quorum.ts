/** Pure quorum state machine — the heart of "did we make the minyan?". */
export interface QuorumState {
  count: number;
  target: number;
  reached: boolean;
}

export type QuorumTransition = "none" | "reached" | "lost";

export function quorumState(count: number, target: number): QuorumState {
  return { count, target, reached: count >= target };
}

/**
 * Compares quorum states before and after an RSVP change.
 * "reached" fires exactly on the crossing into quorum (e.g. 9 -> 10),
 * "lost" on the crossing out (e.g. 10 -> 9).
 */
export function evaluateQuorumTransition(
  before: QuorumState,
  after: QuorumState,
): QuorumTransition {
  if (!before.reached && after.reached) return "reached";
  if (before.reached && !after.reached) return "lost";
  return "none";
}
