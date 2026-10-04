import type { MoveEvent } from "@ten-ten/core";
import { PIECES } from "@ten-ten/core";
import { describe, expect, it } from "vitest";
import { recordMove, startRun, summariseRun } from "./run-recorder";

const piece = PIECES[0];
if (!piece) throw new Error("no pieces");
const move = (points: number, lines: number): MoveEvent => ({
  piece,
  row: 0,
  col: 0,
  lines: (1 << lines) - 1,
  points,
  dealt: false,
});

describe("run recorder", () => {
  it("records compact samples with time since the previous move", () => {
    let run = startRun(1_000, 50);
    run = recordMove(run, move(1, 0), 3_000);
    run = recordMove(run, move(11, 1), 3_500);
    expect(run.samples).toEqual([
      [2_000, 1, 0],
      [500, 11, 1],
    ]);
    expect(run.bestAtStart).toBe(50);
    expect(run.archived).toBe(false);
  });

  it("summarises score, lines, best streak and active time (idle capped)", () => {
    let run = startRun(0, 0);
    const moves: [number, number, number][] = [
      [1_000, 5, 0],
      [2_000, 15, 1],
      [3_000, 40, 2],
      [3_000 + 10 * 60_000, 4, 0],
      [3_000 + 10 * 60_000 + 500, 15, 1],
    ];
    for (const [at, points, lines] of moves)
      run = recordMove(run, move(points, lines), at);
    const record = summariseRun(run, "completed", 999_999);
    expect(record).toMatchObject({
      score: 79,
      moves: 5,
      lines: 4,
      bestStreak: 2,
      outcome: "completed",
    });
    expect(record.activeMs).toBe(1_000 + 1_000 + 1_000 + 60_000 + 500);
  });

  it("gives each run a distinct id", () => {
    expect(startRun(1, 0).id).not.toBe(startRun(1, 0).id);
  });
});
