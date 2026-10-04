import type { LineMask, Piece } from "@ten-ten/core";
import { BOARD_SIZE, colsOf, rowsOf } from "@ten-ten/core";
import { pieceColourVar } from "@ten-ten/tokens";

const PREVIEW_ATTR = "data-preview";
const CLEAR_ATTR = "data-clear";
const CELL_COUNT = BOARD_SIZE * BOARD_SIZE;

export interface BoardPreview {
  show(row: number, col: number, lines: LineMask): void;
  clear(): void;
}

/**
 * Draws the drop preview by toggling data attributes on the board's cell
 * elements directly — no React renders while dragging. Attributes are not
 * managed by React, so always `clear()` before the board re-renders.
 */
export function createBoardPreview(
  boardEl: HTMLElement,
  piece: Piece,
): BoardPreview {
  boardEl.style.setProperty("--preview-colour", pieceColourVar(piece.colour));
  const cells = boardEl.children;
  // A cell can be marked twice (preview + clear), so allow 2 marks per cell.
  const marked = new Int16Array(CELL_COUNT * 2);
  let count = 0;

  const mark = (index: number, attr: string) => {
    cells[index]?.setAttribute(attr, "");
    marked[count++] = index;
  };

  const clear = () => {
    for (let i = 0; i < count; i++) {
      const cell = cells[marked[i] ?? 0];
      cell?.removeAttribute(PREVIEW_ATTR);
      cell?.removeAttribute(CLEAR_ATTR);
    }
    count = 0;
  };

  const markLines = (lines: LineMask) => {
    const rows = rowsOf(lines);
    const cols = colsOf(lines);
    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let j = 0; j < BOARD_SIZE; j++) {
        if ((rows >>> i) & 1) mark(i * BOARD_SIZE + j, CLEAR_ATTR);
        if ((cols >>> i) & 1) mark(j * BOARD_SIZE + i, CLEAR_ATTR);
      }
    }
  };

  return {
    show(row, col, lines) {
      clear();
      for (const cell of piece.cells) {
        mark((row + cell.row) * BOARD_SIZE + col + cell.col, PREVIEW_ATTR);
      }
      if (lines !== 0) markLines(lines);
    },
    clear,
  };
}
