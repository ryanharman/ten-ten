import type { GameState } from "@ten-ten/core";
import { BOARD_SIZE, newGame } from "@ten-ten/core";
import { describe, expect, it, vi } from "vitest";
import type { ReturnAnimation } from "./drag-controller";
import { createDragController } from "./drag-controller";

const PITCH = 30;
const GAP_RATIO = 0.1;
const INSET = (PITCH * GAP_RATIO) / 2;

function setup(state: GameState = newGame(1), animateReturn?: ReturnAnimation) {
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
  const target = new EventTarget();
  const frames: (() => void)[] = [];
  const onChange = vi.fn();
  const onDrop = vi.fn();
  const controller = createDragController({
    getBoard: () => boardEl,
    getGhost: () => ghost,
    getState: () => state,
    gapRatio: GAP_RATIO,
    pointerTarget: target,
    onChange,
    onDrop,
    ...(animateReturn ? { animateReturn } : {}),
    requestFrame: (cb) => frames.push(cb),
    cancelFrame: () => {},
  });
  const flush = () => {
    for (const cb of frames.splice(0)) cb();
  };
  const send = (
    type: string,
    pointerId: number,
    at = { clientX: 0, clientY: 0 },
  ) =>
    target.dispatchEvent(Object.assign(new Event(type), { pointerId, ...at }));
  return { boardEl, ghost, controller, onChange, onDrop, flush, send, state };
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
  it("emits the drag view on start and null on cancel", () => {
    const { controller, onChange, state, send } = setup();
    expect(controller.start(0, mouse(1, pointerFor(state, 0, 0, 0)))).toBe(
      true,
    );
    expect(onChange).toHaveBeenLastCalledWith({
      trayIndex: 0,
      piece: state.tray[0],
      pitch: PITCH,
    });
    send("pointercancel", 1);
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it("refuses to start for an empty slot or a finished game", () => {
    const over = setup({ ...newGame(1), isOver: true });
    expect(over.controller.start(0, mouse(1, { clientX: 0, clientY: 0 }))).toBe(
      false,
    );
    const empty = setup({ ...newGame(1), tray: [null, null, null] });
    expect(
      empty.controller.start(0, mouse(1, { clientX: 0, clientY: 0 })),
    ).toBe(false);
  });

  it("recovers from a stuck drag: a new start replaces it and stops listening to the old pointer", () => {
    const { controller, onDrop, onChange, send, state } = setup();
    controller.start(0, mouse(1, pointerFor(state, 0, 0, 0)));
    expect(controller.start(1, mouse(2, pointerFor(state, 1, 0, 0)))).toBe(
      true,
    );
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ trayIndex: 1 }),
    );
    send("pointerup", 1, pointerFor(state, 0, 5, 5));
    expect(onDrop).not.toHaveBeenCalled();
    send("pointerup", 2, pointerFor(state, 1, 5, 5));
    expect(onDrop).toHaveBeenCalledWith(1, 5, 5);
  });

  it("moves the ghost once per frame and previews the snapped cell", () => {
    const { controller, ghost, boardEl, flush, send, state } = setup();
    controller.start(0, mouse(1, pointerFor(state, 0, 0, 0)));
    send("pointermove", 1, pointerFor(state, 0, 3, 4));
    send("pointermove", 1, pointerFor(state, 0, 2, 2));
    flush();
    expect(ghost.style.transform).toBe(
      `translate3d(${INSET + 2 * PITCH}px, ${INSET + 2 * PITCH}px, 0)`,
    );
    expect(
      boardEl.children[2 * BOARD_SIZE + 2]?.hasAttribute("data-preview"),
    ).toBe(true);
  });

  it("ignores events from other pointers", () => {
    const { controller, ghost, flush, send, state, onDrop } = setup();
    controller.start(0, mouse(1, pointerFor(state, 0, 0, 0)));
    flush();
    const before = ghost.style.transform;
    send("pointermove", 2, pointerFor(state, 0, 5, 5));
    send("pointerup", 2, pointerFor(state, 0, 5, 5));
    flush();
    expect(ghost.style.transform).toBe(before);
    expect(onDrop).not.toHaveBeenCalled();
  });

  it("drops on a valid cell using the final pointer position", () => {
    const { controller, onDrop, onChange, boardEl, send, state } = setup();
    controller.start(1, mouse(1, pointerFor(state, 1, 0, 0)));
    send("pointermove", 1, pointerFor(state, 1, 5, 4));
    send("pointerup", 1, pointerFor(state, 1, 5, 4));
    expect(onDrop).toHaveBeenCalledWith(1, 5, 4);
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(boardEl.querySelector("[data-preview]")).toBeNull();
  });

  it("does not drop off the board, and stops listening after the drag ends", () => {
    const { controller, onDrop, send, state } = setup();
    controller.start(0, mouse(1, pointerFor(state, 0, 0, 0)));
    send("pointermove", 1, { clientX: -500, clientY: -500 });
    send("pointerup", 1, { clientX: -500, clientY: -500 });
    send("pointerup", 1, pointerFor(state, 0, 0, 0));
    expect(onDrop).not.toHaveBeenCalled();
  });

  it("animates an invalid drop back before hiding the ghost", async () => {
    let finishReturn = () => {};
    const animateReturn = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishReturn = resolve;
        }),
    );
    const { controller, onChange, send, state } = setup(
      newGame(1),
      animateReturn,
    );
    controller.start(2, mouse(1, pointerFor(state, 2, 0, 0)));
    send("pointerup", 1, { clientX: -500, clientY: -500 });
    expect(animateReturn).toHaveBeenCalledWith(expect.any(HTMLElement), 2);
    expect(onChange).not.toHaveBeenLastCalledWith(null);
    finishReturn();
    await Promise.resolve();
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it("does not let a stale return animation hide a newer drag", async () => {
    let finishReturn = () => {};
    const animateReturn = () =>
      new Promise<void>((resolve) => {
        finishReturn = resolve;
      });
    const { controller, onChange, send, state } = setup(
      newGame(1),
      animateReturn,
    );
    controller.start(0, mouse(1, pointerFor(state, 0, 0, 0)));
    send("pointerup", 1, { clientX: -500, clientY: -500 });
    controller.start(1, mouse(2, pointerFor(state, 1, 0, 0)));
    finishReturn();
    await Promise.resolve();
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ trayIndex: 1 }),
    );
  });

  it("cancel() ends any drag immediately", () => {
    const { controller, onChange, onDrop, send, state } = setup();
    controller.start(0, mouse(1, pointerFor(state, 0, 0, 0)));
    controller.cancel();
    expect(onChange).toHaveBeenLastCalledWith(null);
    send("pointerup", 1, pointerFor(state, 0, 5, 5));
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
