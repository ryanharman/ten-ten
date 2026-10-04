import type { GameState, Piece } from "@ten-ten/core";
import { canPlace, previewLines } from "@ten-ten/core";
import type { BoardPreview } from "./board-preview";
import { createBoardPreview } from "./board-preview";
import type { BoardGeometry, Point } from "./geometry";
import { ghostOrigin, measureBoard, snapCol, snapRow } from "./geometry";

/** How far (in cells) a dragged piece floats above a finger. */
const TOUCH_LIFT_CELLS = 1.5;

/** What the UI needs to render the drag ghost. Emitted once per drag. */
export interface DragView {
  readonly trayIndex: number;
  readonly piece: Piece;
  readonly pitch: number;
}

export interface DragDeps {
  readonly getBoard: () => HTMLElement | null;
  readonly getGhost: () => HTMLElement | null;
  readonly getState: () => GameState;
  readonly gapRatio: number;
  readonly onChange: (view: DragView | null) => void;
  readonly onDrop: (trayIndex: number, row: number, col: number) => void;
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
  /** Starts dragging tray slot `trayIndex`. Returns false if the drag can't start. */
  start(trayIndex: number, input: PointerInput): boolean;
  move(input: PointerInput): void;
  /** Ends the drag; drops the piece if `commit` and the target is valid. */
  end(pointerId: number, commit: boolean): void;
}

/**
 * Framework-agnostic drag & drop. Pointer moves only record coordinates; one
 * frame callback per animation frame moves the ghost (CSS transform) and,
 * when the snapped cell changes, updates the board preview imperatively.
 */
export function createDragController(deps: DragDeps): DragController {
  const requestFrame = deps.requestFrame ?? requestAnimationFrame;
  const cancelFrame = deps.cancelFrame ?? cancelAnimationFrame;
  let session: Session | null = null;

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

  const pieceAt = (trayIndex: number): Piece | null => {
    const state = deps.getState();
    return state.isOver ? null : (state.tray[trayIndex] ?? null);
  };

  return {
    start(trayIndex, input) {
      const piece = pieceAt(trayIndex);
      const boardEl = deps.getBoard();
      if (session || !piece || !boardEl) return false;
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
      deps.onChange({ trayIndex, piece, pitch: geometry.pitch });
      return true;
    },

    move(input) {
      const s = session;
      if (s?.pointerId !== input.pointerId) return;
      s.pointerX = input.clientX;
      s.pointerY = input.clientY;
      if (!s.frame) s.frame = requestFrame(renderFrame);
    },

    end(pointerId, commit) {
      const s = session;
      if (s?.pointerId !== pointerId) return;
      if (s.frame) cancelFrame(s.frame);
      if (commit) renderFrame();
      s.preview.clear();
      session = null;
      deps.onChange(null);
      if (commit && s.valid) deps.onDrop(s.trayIndex, s.row, s.col);
    },
  };
}
