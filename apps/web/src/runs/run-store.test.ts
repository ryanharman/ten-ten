import { newGame, placePiece } from "@ten-ten/core";
import { afterEach, describe, expect, it } from "vitest";
import type { RunRecord } from "./run-recorder";
import { startRun, summariseRun } from "./run-recorder";
import {
  appendRun,
  HISTORY_LIMIT,
  loadHistory,
  loadSession,
  saveSession,
  topRuns,
} from "./run-store";

afterEach(() => localStorage.clear());

const record = (id: string, score: number, endedAt = 0): RunRecord => ({
  ...summariseRun(startRun(0, 0), "completed", endedAt),
  id,
  score,
});

describe("session persistence", () => {
  it("restores the saved game and run", () => {
    const moved = placePiece(newGame(3), 0, 0, 0);
    if (!moved) throw new Error("move should be legal");
    const run = startRun(123, 10);
    saveSession({ state: moved.state, run });
    const loaded = loadSession();
    expect(loaded?.state.score).toBe(moved.state.score);
    expect(Array.from(loaded?.state.board.colours ?? [])).toEqual(
      Array.from(moved.state.board.colours),
    );
    expect(loaded?.run).toEqual(run);
  });

  it.each([
    ["missing", null],
    ["not JSON", "{oops"],
    ["wrong version", JSON.stringify({ v: 9 })],
    ["bad run", JSON.stringify({ v: 1, game: {}, run: { id: 1 } })],
  ])("returns null when the session is %s", (_, raw) => {
    if (raw !== null) localStorage.setItem("ten-ten:session", raw);
    expect(loadSession()).toBeNull();
  });
});

describe("history", () => {
  it("prepends runs newest-first and persists them", () => {
    let history = appendRun([], record("a", 10));
    history = appendRun(history, record("b", 20));
    expect(history.map((r) => r.id)).toEqual(["b", "a"]);
    expect(loadHistory().map((r) => r.id)).toEqual(["b", "a"]);
  });

  it(`keeps at most ${HISTORY_LIMIT} runs`, () => {
    let history: RunRecord[] = [];
    for (let i = 0; i < HISTORY_LIMIT + 5; i++)
      history = appendRun(history, record(String(i), i));
    expect(history).toHaveLength(HISTORY_LIMIT);
    expect(history[0]?.id).toBe(String(HISTORY_LIMIT + 4));
  });

  it("drops invalid entries and survives corrupt storage", () => {
    localStorage.setItem(
      "ten-ten:runs",
      JSON.stringify([record("ok", 5), { id: "bad" }, null]),
    );
    expect(loadHistory().map((r) => r.id)).toEqual(["ok"]);
    localStorage.setItem("ten-ten:runs", "not json");
    expect(loadHistory()).toEqual([]);
  });

  it("ranks top runs by score, earlier run first on ties", () => {
    const history = [
      record("late", 50, 2),
      record("low", 10, 0),
      record("early", 50, 1),
    ];
    expect(topRuns(history, 2).map((r) => r.id)).toEqual(["early", "late"]);
  });
});
