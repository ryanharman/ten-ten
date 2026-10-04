import type { Board } from "./board";
import { createBoard } from "./board";
import { BOARD_SIZE } from "./constants";
import type { Piece } from "./pieces";
import { PIECES } from "./pieces";

/** Builds a board from 10 strings of 10 chars; `#` = occupied (colour slot 1). */
export function boardFromAscii(art: readonly string[]): Board {
  const board = createBoard();
  art.forEach((line, row) => {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (line[col] === "#") {
        board.occupancy[row] = (board.occupancy[row] ?? 0) | (1 << col);
        board.colours[row * BOARD_SIZE + col] = 1;
      }
    }
  });
  return board;
}

export function boardToAscii(board: Board): string[] {
  return Array.from({ length: BOARD_SIZE }, (_, row) =>
    Array.from({ length: BOARD_SIZE }, (_, col) =>
      (board.occupancy[row] ?? 0) & (1 << col) ? "#" : ".",
    ).join(""),
  );
}

export function pieceById(id: string): Piece {
  const piece = PIECES.find((p) => p.id === id);
  if (!piece) throw new Error(`Unknown piece ${id}`);
  return piece;
}
