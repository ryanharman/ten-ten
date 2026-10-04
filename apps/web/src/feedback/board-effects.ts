import type { Board, ColourSlot, LineMask, Piece } from "@ten-ten/core";
import { BOARD_SIZE, colsOf, rowsOf } from "@ten-ten/core";
import { foundation, pieceColourVar } from "@ten-ten/tokens";

const PLACED_ATTR = "data-placed";
const CLEARING_ATTR = "data-clearing";

export interface BoardEffects {
  /**
   * Animates a move on the board. `before` is the board prior to the move:
   * cleared cells are already empty in the new board, so their colours come
   * from `before` (or the placed piece).
   */
  play(
    before: Board,
    piece: Piece,
    row: number,
    col: number,
    lines: LineMask,
  ): void;
  /** Removes all effect attributes immediately (e.g. on restart). */
  reset(): void;
}

interface EffectDeps {
  readonly getBoard: () => HTMLElement | null;
  readonly setTimer?: (cb: () => void, ms: number) => number;
  readonly clearTimer?: (id: number) => void;
}

/** Colour slot a cell had immediately after placement, before lines cleared. */
function colourAfterPlacement(
  before: Board,
  piece: Piece,
  row: number,
  col: number,
  index: number,
): number {
  const r = Math.floor(index / BOARD_SIZE) - row;
  const c = (index % BOARD_SIZE) - col;
  const inPiece =
    r >= 0 &&
    r < piece.height &&
    c >= 0 &&
    ((piece.rowMasks[r] ?? 0) >>> c) & 1;
  return inPiece ? piece.colour : (before.colours[index] ?? 0);
}

/**
 * Placement "pop" and a line-clear wave that ripples outward from the drop
 * point. Effects are attributes + CSS animations on the board's cell
 * elements (see board-view.module.css); the cleared block is drawn by a
 * pseudo-element so the empty cell shows underneath as it shrinks away.
 */
export function createBoardEffects(deps: EffectDeps): BoardEffects {
  const setTimer = deps.setTimer ?? ((cb, ms) => window.setTimeout(cb, ms));
  const clearTimer = deps.clearTimer ?? ((id) => window.clearTimeout(id));
  const timers = new Set<number>();
  const touched = new Set<Element>();

  const mark = (cell: Element | undefined, attr: string, ms: number) => {
    if (!cell) return;
    cell.setAttribute(attr, "");
    touched.add(cell);
    const id = setTimer(() => {
      timers.delete(id);
      cell.removeAttribute(attr);
    }, ms);
    timers.add(id);
  };

  const clearCell = (
    cells: HTMLCollection,
    index: number,
    colour: number,
    distance: number,
  ) => {
    const cell = cells[index];
    if (!(cell instanceof HTMLElement) || colour === 0) return;
    const delay = distance * foundation.duration.stagger;
    cell.style.setProperty(
      "--clearing-colour",
      pieceColourVar(colour as ColourSlot),
    );
    cell.style.setProperty("--clear-delay", `${delay}ms`);
    mark(cell, CLEARING_ATTR, delay + foundation.duration.slow);
  };

  return {
    play(before, piece, row, col, lines) {
      const boardEl = deps.getBoard();
      if (!boardEl) return;
      const cells = boardEl.children;
      for (const cell of piece.cells) {
        mark(
          cells[(row + cell.row) * BOARD_SIZE + col + cell.col],
          PLACED_ATTR,
          foundation.duration.fast,
        );
      }
      const rows = rowsOf(lines);
      const cols = colsOf(lines);
      const centreRow = row + (piece.height - 1) / 2;
      const centreCol = col + (piece.width - 1) / 2;
      for (let i = 0; i < BOARD_SIZE * BOARD_SIZE; i++) {
        const r = Math.floor(i / BOARD_SIZE);
        const c = i % BOARD_SIZE;
        if (!(((rows >>> r) & 1) | ((cols >>> c) & 1))) continue;
        const distance = Math.round(Math.hypot(r - centreRow, c - centreCol));
        clearCell(
          cells,
          i,
          colourAfterPlacement(before, piece, row, col, i),
          distance,
        );
      }
    },

    reset() {
      for (const id of timers) clearTimer(id);
      timers.clear();
      for (const cell of touched) {
        cell.removeAttribute(PLACED_ATTR);
        cell.removeAttribute(CLEARING_ATTR);
      }
      touched.clear();
    },
  };
}
