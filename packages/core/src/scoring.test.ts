import { describe, expect, it } from "vitest";
import type { ScoringEvent } from "./scoring";
import { comboScoring, linePoints, SCORING } from "./scoring";

const event = (overrides: Partial<ScoringEvent>): ScoringEvent => ({
  cellsPlaced: 4,
  rowsCleared: 0,
  colsCleared: 0,
  combo: 0,
  boardCleared: false,
  ...overrides,
});

describe("comboScoring", () => {
  it("awards a point per block placed", () => {
    expect(comboScoring(event({}))).toEqual({
      placed: 4,
      lines: 0,
      multiplier: 1,
      allClear: 0,
      total: 4,
    });
  });

  it("scores lines cleared together by the square of the count", () => {
    expect([1, 2, 3, 4].map(linePoints)).toEqual([10, 40, 90, 160]);
    const score = comboScoring(
      event({ rowsCleared: 1, colsCleared: 1, combo: 1 }),
    );
    expect(score.lines).toBe(40);
    expect(score.total).toBe(44);
  });

  it("multiplies line points by the combo, up to the cap", () => {
    const lines = (combo: number) =>
      comboScoring(event({ rowsCleared: 1, combo })).lines;
    expect([1, 2, 3].map(lines)).toEqual([10, 20, 30]);
    expect(lines(SCORING.maxMultiplier + 3)).toBe(10 * SCORING.maxMultiplier);
  });

  it("adds a bonus for emptying the board", () => {
    const score = comboScoring(
      event({ rowsCleared: 2, combo: 1, boardCleared: true }),
    );
    expect(score.allClear).toBe(SCORING.allClear);
    expect(score.total).toBe(4 + 40 + SCORING.allClear);
  });
});
