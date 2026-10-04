import type { GameState, Piece } from "@ten-ten/core";
import { canPlace, previewLines } from "@ten-ten/core";
import type { BoardPreview } from "./board-preview";
import { createBoardPreview } from "./board-preview";
import type { BoardGeometry, Point } from "./geometry";
import { ghostOrigin, measureBoard, snapCol, snapRow } from "./geometry";

/** How far (in cells) a dragged piece floats above a finger. */
const TOUCH_LIFT_CELLS = 1.5;

/** What the UI needs to render the drag ghost. */
export interface DragView {
  readonly trayIndex: number;
  readonly piece: Piece;
  readonly pitch: number;
}

/** Animates the ghost back to its tray slot; resolves when done. */
export type ReturnAnimation = (
  ghost: HTMLElement,
  trayIndex: number,
) => Promise<void>;

export interface DragDeps {
  readonly getBoard: () => HTMLElement | null;
  readonly getGhost: () => HTMLElement | null;
  readonly getState: () => GameState;
  readonly gapRatio: number;
  /** Receives pointer move/up/cancel events for the active drag (normally `window`). */
  readonly pointerTarget: EventTarget;
  readonly onChange: (view: DragView | null) => void;
  readonly onDrop: (trayIndex: number, row: number, col: number) => void;
  /** Called when a drop is invalid. Omit for an instant return. */
  readonly animateReturn?: ReturnAnimation;
  readonly requestFrame?: (cb: () => void) => number;
  readonly cancelFrame?: (id: number) => void;
}

export interface PointerInput {
  readonly pointerId: number;
  readonly pointerType: string;
  readonly clientX: number;
  readonly clientY: number;
}

interface Session {
  readonly pointerId: number;
  readonly trayIndex: number;
  readonly piece: Piece;
  readonly geometry: BoardGeometry;
  readonly lift: number;
  readonly preview: BoardPreview;
  readonly origin: Point;
  pointerX: number;
  pointerY: number;
  frame: number;
  row: number;
  col: number;
  valid: boolean;
}

export interface DragController {
  /**
   * Starts dragging tray slot `trayIndex`. Any drag already in progress is
   * cancelled first, so a lost pointer-up can never leave the UI stuck.
   * Returns false if the drag can't start.
   */
  start(trayIndex: number, input: PointerInput): boolean;
  /** Abandons any drag (and return animation) immediately. */
  cancel(): void;
}

/**
 * Framework-agnostic drag & drop. After `start`, pointer events are read from
 * `pointerTarget` (not the tray slot), so the drag ends correctly wherever the
 * pointer is released. Moves only record coordinates; one frame callback per
 * animation frame moves the ghost (CSS transform) and, when the snapped cell
 * changes, updates the board preview imperatively.
 */
export function createDragController(deps: DragDeps): DragController {
  const requestFrame = deps.requestFrame ?? requestAnimationFrame;
  const cancelFrame = deps.cancelFrame ?? cancelAnimationFrame;
  let session: Session | null = null;
  /** Bumped whenever a drag starts or is cancelled; stale return animations check it. */
  let generation = 0;

  const updateTarget = (s: Session, row: number, col: number) => {
    s.row = row;
    s.col = col;
    const board = deps.getState().board;
    s.valid = canPlace(board, s.piece, row, col);
    if (s.valid)
      s.preview.show(row, col, previewLines(board, s.piece, row, col));
    else s.preview.clear();
  };

  const renderFrame = () => {
    const s = session;
    if (!s) return;
    s.frame = 0;
    const { x, y } = ghostOrigin(
      s.origin,
      s.pointerX,
      s.pointerY,
      s.piece,
      s.geometry,
      s.lift,
    );
    const ghost = deps.getGhost();
    if (ghost) ghost.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    const row = snapRow(s.geometry, y);
    const col = snapCol(s.geometry, x);
    if (row !== s.row || col !== s.col) updateTarget(s, row, col);
  };

  /** Records the pointer position; returns the session if `e` belongs to it. */
  const track = (e: Event): Session | null => {
    const s = session;
    const p = e as PointerEvent;
    if (s?.pointerId !== p.pointerId) return null;
    s.pointerX = p.clientX;
    s.pointerY = p.clientY;
    return s;
  };

  const onMove = (e: Event) => {
    const s = track(e);
    if (s && !s.frame) s.frame = requestFrame(renderFrame);
  };

  const onUp = (e: Event) => {
    if (track(e)) finish((e as PointerEvent).pointerId, true);
  };
  const onCancel = (e: Event) => finish((e as PointerEvent).pointerId, false);

  const listen = (on: boolean) => {
    const method = on ? "addEventListener" : "removeEventListener";
    deps.pointerTarget[method]("pointermove", onMove);
    deps.pointerTarget[method]("pointerup", onUp);
    deps.pointerTarget[method]("pointercancel", onCancel);
  };

  /** Stops any in-flight return animation and invalidates its completion. */
  const interrupt = () => {
    generation++;
    for (const animation of deps.getGhost()?.getAnimations?.() ?? [])
      animation.cancel();
  };

  /** Tears down the session; returns it so callers can act on the final target. */
  const teardown = (): Session | null => {
    const s = session;
    if (!s) return null;
    if (s.frame) cancelFrame(s.frame);
    s.preview.clear();
    session = null;
    listen(false);
    return s;
  };

  const returnToTray = (trayIndex: number) => {
    const ghost = deps.getGhost();
    if (!deps.animateReturn || !ghost) {
      deps.onChange(null);
      return;
    }
    const current = generation;
    const done = () => {
      if (generation === current) deps.onChange(null);
    };
    deps.animateReturn(ghost, trayIndex).then(done, done);
  };

  function finish(pointerId: number, commit: boolean) {
    if (session?.pointerId !== pointerId) return;
    if (commit) renderFrame();
    const s = teardown();
    if (!s) return;
    if (commit && s.valid) {
      deps.onChange(null);
      deps.onDrop(s.trayIndex, s.row, s.col);
    } else {
      returnToTray(s.trayIndex);
    }
  }

  const pieceAt = (trayIndex: number): Piece | null => {
    const state = deps.getState();
    return state.isOver ? null : (state.tray[trayIndex] ?? null);
  };

  return {
    start(trayIndex, input) {
      const piece = pieceAt(trayIndex);
      const boardEl = deps.getBoard();
      if (!piece || !boardEl) return false;
      teardown();
      interrupt();
      const geometry = measureBoard(
        boardEl.getBoundingClientRect(),
        deps.gapRatio,
      );
      session = {
        pointerId: input.pointerId,
        trayIndex,
        piece,
        geometry,
        lift: input.pointerType === "mouse" ? 0 : TOUCH_LIFT_CELLS,
        preview: createBoardPreview(boardEl, piece),
        origin: { x: 0, y: 0 },
        pointerX: input.clientX,
        pointerY: input.clientY,
        frame: requestFrame(renderFrame),
        row: Number.NaN,
        col: Number.NaN,
        valid: false,
      };
      listen(true);
      deps.onChange({ trayIndex, piece, pitch: geometry.pitch });
      return true;
    },

    cancel() {
      teardown();
      interrupt();
      deps.onChange(null);
    },
  };
}
