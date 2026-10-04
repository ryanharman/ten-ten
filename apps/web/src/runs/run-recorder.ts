import type { MoveEvent } from "@ten-ten/core";
import { countLines } from "@ten-ten/core";

/**
 * One move, compact for storage: [ms since previous move, points, lines].
 * Score and streak over time are derivable — enough for per-run charts later.
 */
export type MoveSample = readonly [dtMs: number, points: number, lines: number];

/** The run in progress; saved with the game so it survives reloads. */
export interface CurrentRun {
  readonly id: string;
  readonly startedAt: number;
  readonly lastMoveAt: number;
  readonly samples: readonly MoveSample[];
  /** Best score when this run started — to know if the run set a new best. */
  readonly bestAtStart: number;
  /** True once this run has been written to the history (game over). */
  readonly archived: boolean;
}

export type RunOutcome = "completed" | "abandoned";

/** A finished run, as stored in the history. */
export interface RunRecord {
  readonly id: string;
  readonly startedAt: number;
  readonly endedAt: number;
  readonly outcome: RunOutcome;
  readonly score: number;
  readonly moves: number;
  readonly lines: number;
  readonly bestStreak: number;
  /** Play time, with idle gaps between moves capped (see IDLE_CAP_MS). */
  readonly activeMs: number;
  readonly samples: readonly MoveSample[];
}

/** Gaps longer than this between moves count as idle (tab closed, phone down). */
const IDLE_CAP_MS = 60_000;

export function startRun(now: number, bestAtStart: number): CurrentRun {
  return {
    id: `${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    startedAt: now,
    lastMoveAt: now,
    samples: [],
    bestAtStart,
    archived: false,
  };
}

export function recordMove(
  run: CurrentRun,
  event: MoveEvent,
  now: number,
): CurrentRun {
  const sample: MoveSample = [
    Math.max(0, now - run.lastMoveAt),
    event.points,
    countLines(event.lines),
  ];
  return { ...run, lastMoveAt: now, samples: [...run.samples, sample] };
}

function bestStreak(samples: readonly MoveSample[]): number {
  let best = 0;
  let current = 0;
  for (const [, , lines] of samples) {
    current = lines > 0 ? current + 1 : 0;
    best = Math.max(best, current);
  }
  return best;
}

export function summariseRun(
  run: CurrentRun,
  outcome: RunOutcome,
  now: number,
): RunRecord {
  let score = 0;
  let lines = 0;
  let activeMs = 0;
  for (const [dt, points, cleared] of run.samples) {
    score += points;
    lines += cleared;
    activeMs += Math.min(dt, IDLE_CAP_MS);
  }
  return {
    id: run.id,
    startedAt: run.startedAt,
    endedAt: now,
    outcome,
    score,
    moves: run.samples.length,
    lines,
    bestStreak: bestStreak(run.samples),
    activeMs,
    samples: run.samples,
  };
}
