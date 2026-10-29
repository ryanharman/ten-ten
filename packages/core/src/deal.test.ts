import { describe, expect, it } from "vitest";
import { createBoard } from "./board";
import type { DealAssist, WeightedPiece } from "./deal";
import { boardFill, canPlaceAll, dealTray } from "./deal";
import { PIECES } from "./pieces";
import { boardFromAscii, pieceById } from "./test-utils";

const DECK: WeightedPiece[] = PIECES.map((piece) => ({ piece, weight: 1 }));
const ASSIST: DealAssist = {
  maxFill: 70,
  attempts: 8,
  searchBudget: 600,
  misfitWeight: 0.25,
};

/** A checkerboard of 2×2 blocks, about half full: only small pieces fit. */
const FRAGMENTED = boardFromAscii([
  "##..##..##",
  "##..##..##",
  "..##..##..",
  "..##..##..",
  "##..##..##",
  "##..##..##",
  "..##..##..",
  "..##..##..",
  "##..##..##",
  "##..##..##",
]);

describe("boardFill", () => {
  it("counts occupied cells", () => {
    expect(boardFill(createBoard())).toBe(0);
    expect(boardFill(FRAGMENTED)).toBe(52);
  });
});

describe("canPlaceAll", () => {
  it("finds an order that works", () => {
    const pieces = ["square3", "line5-h", "dot"].map(pieceById);
    expect(canPlaceAll(createBoard(), pieces)).toBe(true);
    expect(canPlaceAll(createBoard(), [])).toBe(true);
  });

  it("counts space freed by clearing lines", () => {
    // Only column 9 is free: line5-h fits once another piece completes a row.
    const board = boardFromAscii(Array(10).fill("#########."));
    const line = pieceById("line5-h");
    expect(canPlaceAll(board, [line])).toBe(false);
    expect(canPlaceAll(board, [line, pieceById("dot")])).toBe(true);
    expect(canPlaceAll(board, [line, pieceById("square2")])).toBe(false);
  });

  it("rejects at once when the pieces that fit can't clear any line", () => {
    // 3 cells can't finish a line on a board whose emptiest line has 4 gaps.
    const pieces = ["dot", "line2-h", "square3"].map(pieceById);
    expect(canPlaceAll(FRAGMENTED, pieces, 0)).toBe(false);
  });

  it("fails when pieces can't share the space", () => {
    const pieces = ["square2", "square2", "square2"].map(pieceById);
    expect(canPlaceAll(FRAGMENTED, pieces)).toBe(true);
    expect(canPlaceAll(FRAGMENTED, [pieceById("square3")])).toBe(false);
    expect(
      canPlaceAll(FRAGMENTED, ["line2-h", "square3", "dot"].map(pieceById)),
    ).toBe(false);
  });

  it("gives up and answers true once its work budget is spent", () => {
    const pieces = ["square2", "corner2-tl", "square3"].map(pieceById);
    expect(canPlaceAll(FRAGMENTED, pieces)).toBe(false);
    expect(canPlaceAll(FRAGMENTED, pieces, 10)).toBe(true);
  });
});

describe("dealTray", () => {
  const ids = (deal: { tray: readonly { id: string }[] }) =>
    deal.tray.map((p) => p.id);

  it("is deterministic", () => {
    const a = dealTray(99, FRAGMENTED, 3, DECK, ASSIST);
    const b = dealTray(99, FRAGMENTED, 3, DECK, ASSIST);
    expect(ids(a)).toEqual(ids(b));
    expect(a.rngState).toBe(b.rngState);
  });

  it("deals trays that can all be placed while the board has room", () => {
    let unassistedMisses = 0;
    for (let seed = 0; seed < 50; seed++) {
      const assisted = dealTray(seed, FRAGMENTED, 3, DECK, ASSIST);
      expect(canPlaceAll(FRAGMENTED, assisted.tray)).toBe(true);
      const random = dealTray(seed, FRAGMENTED, 3, DECK);
      if (!canPlaceAll(FRAGMENTED, random.tray)) unassistedMisses++;
    }
    expect(unassistedMisses).toBeGreaterThan(10);
  });

  it("leaves deals random once the board is fuller than maxFill", () => {
    const strict = { ...ASSIST, maxFill: 49 };
    for (let seed = 0; seed < 20; seed++) {
      expect(ids(dealTray(seed, FRAGMENTED, 3, DECK, strict))).toEqual(
        ids(dealTray(seed, FRAGMENTED, 3, DECK)),
      );
    }
  });

  it("falls back to pieces that fit, then to any tray", () => {
    const square3 = { piece: pieceById("square3"), weight: 1 };
    const dot = { piece: pieceById("dot"), weight: 0.001 };
    const oneTry = { ...ASSIST, attempts: 2, misfitWeight: 1 };
    expect(ids(dealTray(1, FRAGMENTED, 3, [square3, dot], oneTry))).toEqual([
      "dot",
      "dot",
      "dot",
    ]);
    expect(ids(dealTray(1, FRAGMENTED, 3, [square3], ASSIST))).toEqual([
      "square3",
      "square3",
      "square3",
    ]);
  });

  it("throws on an empty deck", () => {
    expect(() => dealTray(1, createBoard(), 3, [])).toThrow(/empty deck/);
  });
});
