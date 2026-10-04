import type { GameState, SavedGame } from "@ten-ten/core";
import { deserializeGame, serializeGame } from "@ten-ten/core";
import { readStored, writeStored } from "../storage";
import type { CurrentRun, MoveSample, RunRecord } from "./run-recorder";

const SESSION_KEY = "session";
const HISTORY_KEY = "runs";
/** Most recent runs kept (~2 KB each). */
export const HISTORY_LIMIT = 100;

interface StoredSession {
  readonly v: 1;
  readonly game: SavedGame;
  readonly run: CurrentRun;
}

export interface Session {
  readonly state: GameState;
  readonly run: CurrentRun;
}

function parse(key: string): unknown {
  const raw = readStored(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const isNum = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

const isSample = (s: unknown): s is MoveSample =>
  Array.isArray(s) && s.length === 3 && s.every(isNum);

function isRun(r: unknown): r is CurrentRun {
  if (typeof r !== "object" || r === null) return false;
  const run = r as Record<string, unknown>;
  return (
    typeof run.id === "string" &&
    isNum(run.startedAt) &&
    isNum(run.lastMoveAt) &&
    isNum(run.bestAtStart) &&
    typeof run.archived === "boolean" &&
    Array.isArray(run.samples) &&
    run.samples.every(isSample)
  );
}

function isRecord(r: unknown): r is RunRecord {
  if (typeof r !== "object" || r === null) return false;
  const rec = r as Record<string, unknown>;
  const numbers = [
    "startedAt",
    "endedAt",
    "score",
    "moves",
    "lines",
    "bestStreak",
    "activeMs",
  ];
  return (
    typeof rec.id === "string" &&
    (rec.outcome === "completed" || rec.outcome === "abandoned") &&
    numbers.every((key) => isNum(rec[key])) &&
    Array.isArray(rec.samples) &&
    rec.samples.every(isSample)
  );
}

/** The saved game + run, or `null` if there is none or it's invalid. */
export function loadSession(): Session | null {
  const data = parse(SESSION_KEY) as Partial<StoredSession> | null;
  if (data?.v !== 1 || !isRun(data.run)) return null;
  const state = deserializeGame(data.game);
  return state ? { state, run: data.run } : null;
}

export function saveSession({ state, run }: Session): void {
  const stored: StoredSession = { v: 1, game: serializeGame(state), run };
  writeStored(SESSION_KEY, JSON.stringify(stored));
}

/** Run history, newest first. Invalid entries are dropped. */
export function loadHistory(): RunRecord[] {
  const data = parse(HISTORY_KEY);
  return Array.isArray(data) ? data.filter(isRecord) : [];
}

/** Prepends `record`, trims to HISTORY_LIMIT, persists and returns the new history. */
export function appendRun(
  history: readonly RunRecord[],
  record: RunRecord,
): RunRecord[] {
  const next = [record, ...history].slice(0, HISTORY_LIMIT);
  writeStored(HISTORY_KEY, JSON.stringify(next));
  return next;
}

/** Highest-scoring completed or abandoned runs; ties go to the earlier run. */
export function topRuns(
  history: readonly RunRecord[],
  count: number,
): RunRecord[] {
  return [...history]
    .sort((a, b) => b.score - a.score || a.endedAt - b.endedAt)
    .slice(0, count);
}
