import { BOARD_SIZE, createBoard, PIECES, previewLines } from "@ten-ten/core";
import { describe, expect, it } from "vitest";
import { createBoardEffects } from "./board-effects";

const piece = (id: string) => {
  const p = PIECES.find((x) => x.id === id);
  if (!p) throw new Error(id);
  return p;
};

function setup() {
  const boardEl = document.createElement("div");
  for (let i = 0; i < BOARD_SIZE * BOARD_SIZE; i++)
    boardEl.append(document.createElement("div"));
  const timers = new Map<number, () => void>();
  let nextId = 1;
  const effects = createBoardEffects({
    getBoard: () => boardEl,
    setTimer: (cb) => {
      timers.set(nextId, cb);
      return nextId++;
    },
    clearTimer: (id) => timers.delete(id),
  });
  const runTimers = () => {
    for (const [id, cb] of [...timers]) {
      timers.delete(id);
      cb();
    }
  };
  const cellsWith = (attr: string) =>
    [...boardEl.children].flatMap((c, i) => (c.hasAttribute(attr) ? [i] : []));
  return { boardEl, effects, runTimers, cellsWith, timers };
}

describe("createBoardEffects", () => {
  it("pops the placed cells, then removes the effect", () => {
    const { effects, runTimers, cellsWith } = setup();
    effects.play(createBoard(), piece("square2"), 0, 0, 0);
    expect(cellsWith("data-placed")).toEqual([0, 1, 10, 11]);
    expect(cellsWith("data-clearing")).toEqual([]);
    runTimers();
    expect(cellsWith("data-placed")).toEqual([]);
  });

  it("animates every cleared cell with its pre-clear colour and a staggered delay", () => {
    const { boardEl, effects, cellsWith } = setup();
    const before = createBoard();
    before.occupancy[0] = 0b1111111110;
    before.colours.fill(3, 1, BOARD_SIZE);
    const dot = piece("dot");
    effects.play(before, dot, 0, 0, previewLines(before, dot, 0, 0));
    expect(cellsWith("data-clearing")).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const first = boardEl.children[0] as HTMLElement;
    const last = boardEl.children[9] as HTMLElement;
    expect(first.style.getPropertyValue("--clearing-colour")).toBe(
      `var(--color-piece-${dot.colour})`,
    );
    expect(last.style.getPropertyValue("--clearing-colour")).toBe(
      "var(--color-piece-3)",
    );
    expect(first.style.getPropertyValue("--clear-delay")).toBe("0ms");
    expect(
      Number.parseInt(last.style.getPropertyValue("--clear-delay"), 10),
    ).toBeGreaterThan(0);
  });

  it("reset() removes effects and pending timers immediately", () => {
    const { effects, cellsWith, timers } = setup();
    effects.play(createBoard(), piece("line3-h"), 4, 4, 0);
    effects.reset();
    expect(cellsWith("data-placed")).toEqual([]);
    expect(timers.size).toBe(0);
  });
});
