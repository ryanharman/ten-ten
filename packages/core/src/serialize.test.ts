import { describe, expect, it } from "vitest";
import { newGame, placePiece } from "./game";
import { deserializeGame, serializeGame } from "./serialize";
import { boardFromAscii } from "./test-utils";

function playedGame() {
  let state = newGame(42);
  for (const [i, col] of [
    [0, 0],
    [1, 5],
  ] as const) {
    const result = placePiece(state, i, 0, col);
    if (result) state = result.state;
  }
  return state;
}

describe("serializeGame / deserializeGame", () => {
  it("round-trips a game through JSON exactly", () => {
    const state = playedGame();
    const restored = deserializeGame(
      JSON.parse(JSON.stringify(serializeGame(state))),
    );
    expect(restored).not.toBeNull();
    expect(Array.from(restored?.board.occupancy ?? [])).toEqual(
      Array.from(state.board.occupancy),
    );
    expect(Array.from(restored?.board.colours ?? [])).toEqual(
      Array.from(state.board.colours),
    );
    expect(restored?.tray.map((p) => p?.id ?? null)).toEqual(
      state.tray.map((p) => p?.id ?? null),
    );
    expect(restored?.score).toBe(state.score);
    expect(restored?.rngState).toBe(state.rngState);
  });

  it("continues identically after a restore (same pieces dealt)", () => {
    let original = newGame(7);
    let restored = deserializeGame(serializeGame(original));
    for (let i = 0; i < 3; i++) {
      const a = placePiece(original, i, i * 3, 0);
      const b = restored && placePiece(restored, i, i * 3, 0);
      if (!a || !b) throw new Error("move should be legal");
      original = a.state;
      restored = b.state;
    }
    expect(restored?.tray.map((p) => p?.id)).toEqual(
      original.tray.map((p) => p?.id),
    );
  });

  it("recomputes game over instead of trusting the save", () => {
    const state = {
      ...newGame(1),
      board: boardFromAscii(Array(10).fill("##########")),
    };
    const saved = serializeGame(state);
    expect(deserializeGame(saved)?.isOver).toBe(true);
  });

  it.each([
    ["null", null],
    ["wrong version", { ...serializeGame(newGame(1)), v: 2 }],
    ["short board", { ...serializeGame(newGame(1)), colours: [0, 0] }],
    [
      "bad colour",
      { ...serializeGame(newGame(1)), colours: Array(100).fill(12) },
    ],
    [
      "unknown piece",
      { ...serializeGame(newGame(1)), tray: ["nope", null, null] },
    ],
    ["empty tray", { ...serializeGame(newGame(1)), tray: [null, null, null] }],
    ["wrong tray size", { ...serializeGame(newGame(1)), tray: ["dot"] }],
    ["negative score", { ...serializeGame(newGame(1)), score: -5 }],
  ])("rejects invalid data: %s", (_, data) => {
    expect(deserializeGame(data)).toBeNull();
  });
});
