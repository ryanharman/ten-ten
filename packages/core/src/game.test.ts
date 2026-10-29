import { describe, expect, it } from "vitest";
import { BOARD_SIZE } from "./constants";
import type { GameRules, GameState } from "./game";
import { DEFAULT_RULES, newGame, placePiece } from "./game";
import type { Piece } from "./pieces";
import { SCORING } from "./scoring";
import { boardFromAscii, pieceById } from "./test-utils";

function onlyPiece(piece: Piece): GameRules {
  return { ...DEFAULT_RULES, deck: [{ piece, weight: 1 }] };
}

describe("newGame", () => {
  it("deals a full tray onto an empty board", () => {
    const state = newGame(1);
    expect(state.tray).toHaveLength(3);
    expect(state.tray.every((p) => p !== null)).toBe(true);
    expect(state.score).toBe(0);
    expect(state.isOver).toBe(false);
  });

  it("is deterministic for a given seed", () => {
    const ids = (s: GameState) => s.tray.map((p) => p?.id);
    expect(ids(newGame(42))).toEqual(ids(newGame(42)));
    const differs = [1, 2, 3, 4, 5].some(
      (seed) => ids(newGame(seed)).join() !== ids(newGame(seed + 100)).join(),
    );
    expect(differs).toBe(true);
  });

  it("respects deck weights", () => {
    const rules = onlyPiece(pieceById("square3"));
    expect(newGame(7, rules).tray.every((p) => p?.id === "square3")).toBe(true);
  });
});

describe("placePiece", () => {
  const rules = onlyPiece(pieceById("dot"));

  it("rejects illegal moves", () => {
    const state = newGame(1, rules);
    expect(placePiece(state, 5, 0, 0, rules)).toBeNull();
    expect(placePiece(state, 0, BOARD_SIZE, 0, rules)).toBeNull();
    const used = placePiece(state, 0, 0, 0, rules)?.state;
    expect(used && placePiece(used, 0, 1, 1, rules)).toBeNull();
    expect(used && placePiece(used, 1, 0, 0, rules)).toBeNull();
  });

  it("empties the slot, scores, and leaves the input state untouched", () => {
    const state = newGame(1, rules);
    const result = placePiece(state, 1, 4, 4, rules);
    expect(result?.state.tray[1]).toBeNull();
    expect(result?.state.score).toBe(1);
    expect(result?.event.score.total).toBe(1);
    expect(state.tray[1]).not.toBeNull();
    expect(state.board.occupancy[4]).toBe(0);
  });

  it("deals a new tray once all pieces are placed", () => {
    let state = newGame(1, rules);
    for (let i = 0; i < 3; i++) {
      const result = placePiece(state, i, 0, i, rules);
      if (!result) throw new Error("move should be legal");
      expect(result.event.dealt).toBe(i === 2);
      state = result.state;
    }
    expect(state.tray.every((p) => p !== null)).toBe(true);
  });

  it("scores line clears and builds a combo within the window", () => {
    const start: GameState = {
      ...newGame(1, rules),
      board: boardFromAscii([".#########", ".#########"]),
    };
    const first = placePiece(start, 0, 0, 0, rules);
    expect(first?.event.lines).toBe(0b1);
    expect(first?.event.score.total).toBe(1 + 10);
    expect(first?.state).toMatchObject({ combo: 1, comboMovesLeft: 3 });

    // Two misses keep the combo alive; the third placement clears for ×2.
    let state = first?.state;
    for (const col of [2, 3]) {
      state = state && placePiece(state, col - 1, 4, col, rules)?.state;
    }
    expect(state).toMatchObject({ combo: 1, comboMovesLeft: 1 });
    const second = state && placePiece(state, 0, 1, 0, rules);
    expect(second?.event.score.multiplier).toBe(2);
    expect(second?.event.score.lines).toBe(20);
    expect(second?.state).toMatchObject({ combo: 2, comboMovesLeft: 3 });
  });

  it("ends the combo after the window passes without a clear", () => {
    let state: GameState | undefined = {
      ...newGame(1, rules),
      combo: 2,
      comboMovesLeft: 2,
    };
    state = placePiece(state, 0, 5, 5, rules)?.state;
    expect(state).toMatchObject({ combo: 2, comboMovesLeft: 1 });
    state = state && placePiece(state, 1, 6, 6, rules)?.state;
    expect(state).toMatchObject({ combo: 0, comboMovesLeft: 0 });
  });

  it("awards the all-clear bonus when a move empties the board", () => {
    const start: GameState = {
      ...newGame(1, rules),
      board: boardFromAscii([".#########"]),
    };
    const result = placePiece(start, 0, 0, 0, rules);
    expect(result?.event.score.allClear).toBe(SCORING.allClear);
  });

  it("ends the game when no tray piece fits", () => {
    const rules3 = onlyPiece(pieceById("square3"));
    const nearlyFull = Array.from({ length: BOARD_SIZE }, (_, r): string =>
      r % 2 ? "#.#.#.#.#." : ".#.#.#.#.#",
    );
    nearlyFull[0] = "...#.#.#.#";
    nearlyFull[1] = "...#.#.#.#";
    nearlyFull[2] = "...#.#.#.#";
    const state: GameState = {
      ...newGame(1, rules3),
      board: boardFromAscii(nearlyFull),
    };
    const result = placePiece(state, 0, 0, 0, rules3);
    expect(result?.state.isOver).toBe(true);
    expect(result && placePiece(result.state, 1, 0, 0, rules3)).toBeNull();
  });
});
