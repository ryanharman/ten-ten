import { describe, expect, it } from "vitest";
import { classicScoring } from "./scoring";

describe("classicScoring", () => {
  it("awards a point per cell plus a triangular line bonus", () => {
    const score = (
      cellsPlaced: number,
      rowsCleared: number,
      colsCleared: number,
    ) => classicScoring({ cellsPlaced, rowsCleared, colsCleared, streak: 0 });
    expect(score(4, 0, 0)).toBe(4);
    expect(score(1, 1, 0)).toBe(11);
    expect(score(1, 1, 1)).toBe(31);
    expect(score(5, 2, 1)).toBe(65);
  });
});
