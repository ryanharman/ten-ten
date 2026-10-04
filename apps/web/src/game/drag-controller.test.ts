import type { GameState } from "@ten-ten/core";
import { BOARD_SIZE, newGame } from "@ten-ten/core";
import { describe, expect, it, vi } from "vitest";
import { createDragController } from "./drag-controller";

const PITCH = 30;
const GAP_RATIO = 0.1;
const INSET = (PITCH * GAP_RATIO) / 2;

function setup(state: GameState = newGame(1)) {
  const boardEl = document.createElement("div");
  for (let i = 0; i < BOARD_SIZE * BOARD_SIZE; i++)
    boardEl.append(document.createElement("div"));
  boardEl.getBoundingClientRect = () =>
    ({
      left: 0,
      top: 0,
      width: PITCH * BOARD_SIZE,
      height: PITCH * BOARD_SIZE,
    }) as DOMRect;
  const ghost = document.createElement("div");
  const frames: (() => void)[] = [];
  const onChange = vi.fn();
  const onDrop = vi.fn();
  const controller = createDragController({
    getBoard: () => boardEl,
    getGhost: () => ghost,
    getState: () => state,
    gapRatio: GAP_RATIO,
    onChange,
    onDrop,
    requestFrame: (cb) => frames.push(cb),
    cancelFrame: () => {},
  });
  const flush = () => {
    for (const cb of frames.splice(0)) cb();
  };
  return { boardEl, ghost, controller, onChange, onDrop, flush, state };
}

/** Pointer position that puts a mouse-dragged piece's top-left cell at (row, col). */
function pointerFor(
  state: GameState,
  trayIndex: number,
  row: number,
  col: number,
) {
  const piece = state.tray[trayIndex];
  if (!piece) throw new Error("empty slot");
  const gap = INSET * 2;
  return {
    clientX: INSET + col * PITCH + (piece.width * PITCH - gap) / 2,
    clientY: INSET + row * PITCH + (piece.height * PITCH - gap) / 2,
  };
}

const mouse = (
  pointerId: number,
  at: { clientX: number; clientY: number },
) => ({
  pointerId,
  pointerType: "mouse",
  ...at,
});

describe("createDragController", () => {
  it("emits the drag view on start and null on end", () => {
    const { controller, onChange, state } = setup();
    expect(controller.start(0, mouse(1, pointerFor(state, 0, 0, 0)))).toBe(
      true,
    );
    expect(onChange).toHaveBeenLastCalledWith({
      trayIndex: 0,
      piece: state.tray[0],
      pitch: PITCH,
    });
    controller.end(1, false);
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it("refuses to start a second drag, an empty slot, or a finished game", () => {
    const { controller, state } = setup();
    controller.start(0, mouse(1, pointerFor(state, 0, 0, 0)));
    expect(controller.start(1, mouse(2, { clientX: 0, clientY: 0 }))).toBe(
      false,
    );

    const over = setup({ ...newGame(1), isOver: true });
    expect(over.controller.start(0, mouse(1, { clientX: 0, clientY: 0 }))).toBe(
      false,
    );

    const empty = setup({ ...newGame(1), tray: [null, null, null] });
    expect(
      empty.controller.start(0, mouse(1, { clientX: 0, clientY: 0 })),
    ).toBe(false);
  });

  it("moves the ghost once per frame and previews the snapped cell", () => {
    const { controller, ghost, boardEl, flush, state } = setup();
    controller.start(0, mouse(1, pointerFor(state, 0, 0, 0)));
    controller.move(mouse(1, pointerFor(state, 0, 3, 4)));
    controller.move(mouse(1, pointerFor(state, 0, 2, 2)));
    flush();
    expect(ghost.style.transform).toBe(
      `translate3d(${INSET + 2 * PITCH}px, ${INSET + 2 * PITCH}px, 0)`,
    );
    expect(
      boardEl.children[2 * BOARD_SIZE + 2]?.hasAttribute("data-preview"),
    ).toBe(true);
  });

  it("ignores moves from other pointers", () => {
    const { controller, ghost, flush, state } = setup();
    controller.start(0, mouse(1, pointerFor(state, 0, 0, 0)));
    flush();
    const before = ghost.style.transform;
    controller.move(mouse(2, pointerFor(state, 0, 5, 5)));
    flush();
    expect(ghost.style.transform).toBe(before);
  });

  it("drops on a valid cell using the final pointer position", () => {
    const { controller, onDrop, boardEl, state } = setup();
    controller.start(1, mouse(1, pointerFor(state, 1, 0, 0)));
    controller.move(mouse(1, pointerFor(state, 1, 5, 4)));
    controller.end(1, true);
    expect(onDrop).toHaveBeenCalledWith(1, 5, 4);
    expect(boardEl.querySelector("[data-preview]")).toBeNull();
  });

  it("does not drop off the board or on cancel", () => {
    const { controller, onDrop, state } = setup();
    controller.start(0, mouse(1, pointerFor(state, 0, 0, 0)));
    controller.move(mouse(1, { clientX: -500, clientY: -500 }));
    controller.end(1, true);
    controller.start(0, mouse(2, pointerFor(state, 0, 0, 0)));
    controller.end(2, false);
    expect(onDrop).not.toHaveBeenCalled();
  });

  it("lifts the piece above a touch pointer", () => {
    const { controller, ghost, flush, state } = setup();
    controller.start(0, {
      pointerId: 1,
      pointerType: "touch",
      clientX: 150,
      clientY: 290,
    });
    flush();
    const piece = state.tray[0];
    if (!piece) throw new Error("empty slot");
    const height = piece.height * PITCH - INSET * 2;
    expect(ghost.style.transform).toContain(`${290 - height - 1.5 * PITCH}px`);
  });
});
