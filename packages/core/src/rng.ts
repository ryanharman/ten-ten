/**
 * Seedable PRNG (mulberry32). State is a plain 32-bit integer so it can live
 * in game state, keeping game transitions pure and replayable.
 */
export interface RandomStep {
  /** Uniform float in [0, 1). */
  readonly value: number;
  readonly state: number;
}

export function nextRandom(state: number): RandomStep {
  const next = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(next ^ (next >>> 15), 1 | next);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, state: next };
}
