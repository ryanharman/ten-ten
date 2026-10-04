import { popcount } from "./bits";
import { BOARD_SIZE, FULL_LINE } from "./constants";
import type { Piece } from "./pieces";

/**
 * Board state. Treat as immutable: functions here never mutate their input
 * board, they return a new one.
 */
export interface Board {
  /** One 10-bit mask per row; bit `c` set means column `c` is occupied. */
  readonly occupancy: Uint16Array;
  /** Colour slot per cell, indexed `row * BOARD_SIZE + col`. 0 = empty. */
  readonly colours: Uint8Array;
}

/**
 * Packed set of completed lines: bits 0–9 are rows, bits 10–19 are columns.
 * A plain number so hot-path previews don't allocate.
 */
export type LineMask = number;

export function createBoard(): Board {
  return {
    occupancy: new Uint16Array(BOARD_SIZE),
    colours: new Uint8Array(BOARD_SIZE * BOARD_SIZE),
  };
}

export function rowsOf(lines: LineMask): number {
  return lines & FULL_LINE;
}

export function colsOf(lines: LineMask): number {
  return (lines >>> BOARD_SIZE) & FULL_LINE;
}

export function countLines(lines: LineMask): number {
  return popcount(lines);
}

/** Whether `piece` fits with its top-left corner at (`row`, `col`). Allocation-free. */
export function canPlace(
  board: Board,
  piece: Piece,
  row: number,
  col: number,
): boolean {
  if (
    row < 0 ||
    col < 0 ||
    row + piece.height > BOARD_SIZE ||
    col + piece.width > BOARD_SIZE
  ) {
    return false;
  }
  for (let i = 0; i < piece.height; i++) {
    const shifted = (piece.rowMasks[i] ?? 0) << col;
    if (((board.occupancy[row + i] ?? 0) & shifted) !== 0) return false;
  }
  return true;
}

/** Whether `piece` fits anywhere on the board. */
export function canPlaceAnywhere(board: Board, piece: Piece): boolean {
  for (let row = 0; row <= BOARD_SIZE - piece.height; row++) {
    for (let col = 0; col <= BOARD_SIZE - piece.width; col++) {
      if (canPlace(board, piece, row, col)) return true;
    }
  }
  return false;
}

/**
 * Lines that would complete if `piece` were placed at (`row`, `col`).
 * Assumes `canPlace` is true. Allocation-free, for drag previews.
 */
export function previewLines(
  board: Board,
  piece: Piece,
  row: number,
  col: number,
): LineMask {
  let fullRows = 0;
  let fullCols = FULL_LINE;
  for (let r = 0; r < BOARD_SIZE; r++) {
    const pieceRow = r - row;
    const pieceMask =
      pieceRow >= 0 && pieceRow < piece.height
        ? (piece.rowMasks[pieceRow] ?? 0) << col
        : 0;
    const value = (board.occupancy[r] ?? 0) | pieceMask;
    if (value === FULL_LINE) fullRows |= 1 << r;
    fullCols &= value;
  }
  return fullRows | (fullCols << BOARD_SIZE);
}

export interface Placement {
  readonly board: Board;
  /** Lines completed by this placement (already cleared from `board`). */
  readonly lines: LineMask;
}

/** Places `piece` and clears completed lines. Assumes `canPlace` is true. */
export function placeOnBoard(
  board: Board,
  piece: Piece,
  row: number,
  col: number,
): Placement {
  const lines = previewLines(board, piece, row, col);
  const occupancy = board.occupancy.slice();
  const colours = board.colours.slice();

  for (let i = 0; i < piece.height; i++) {
    occupancy[row + i] =
      (occupancy[row + i] ?? 0) | ((piece.rowMasks[i] ?? 0) << col);
  }
  for (const cell of piece.cells) {
    colours[(row + cell.row) * BOARD_SIZE + col + cell.col] = piece.colour;
  }
  clearLines(occupancy, colours, lines);

  return { board: { occupancy, colours }, lines };
}

function clearLines(
  occupancy: Uint16Array,
  colours: Uint8Array,
  lines: LineMask,
): void {
  const rows = rowsOf(lines);
  const cols = colsOf(lines);
  if (rows === 0 && cols === 0) return;

  for (let r = 0; r < BOARD_SIZE; r++) {
    const rowCleared = (rows >>> r) & 1;
    occupancy[r] = rowCleared ? 0 : (occupancy[r] ?? 0) & ~cols;
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (rowCleared || (cols >>> c) & 1) colours[r * BOARD_SIZE + c] = 0;
    }
  }
}
