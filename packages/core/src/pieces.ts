/**
 * The classic piece set: 19 shapes. Pieces are never rotated by the player;
 * each orientation is its own piece.
 *
 * Shapes are authored as ASCII art (`#` = filled) and compiled once at module
 * load into per-row bitmasks for fast placement checks.
 */

/** Identifies a colour in the theme's piece palette. 0 means "empty cell". */
export type ColourSlot = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface Cell {
  readonly row: number;
  readonly col: number;
}

export interface Piece {
  readonly id: string;
  readonly colour: ColourSlot;
  readonly width: number;
  readonly height: number;
  /** One bitmask per piece row; bit `c` set means column `c` is filled. */
  readonly rowMasks: readonly number[];
  /** Filled cells relative to the piece's top-left corner. */
  readonly cells: readonly Cell[];
}

function definePiece(
  id: string,
  colour: ColourSlot,
  art: readonly string[],
): Piece {
  const cells: Cell[] = [];
  const rowMasks = art.map((line, row) => {
    let mask = 0;
    for (let col = 0; col < line.length; col++) {
      if (line[col] === "#") {
        mask |= 1 << col;
        cells.push({ row, col });
      }
    }
    return mask;
  });
  const width = Math.max(...art.map((line) => line.length));
  return { id, colour, width, height: art.length, rowMasks, cells };
}

export const PIECES: readonly Piece[] = [
  definePiece("dot", 1, ["#"]),

  definePiece("line2-h", 2, ["##"]),
  definePiece("line2-v", 2, ["#", "#"]),
  definePiece("line3-h", 3, ["###"]),
  definePiece("line3-v", 3, ["#", "#", "#"]),
  definePiece("line4-h", 4, ["####"]),
  definePiece("line4-v", 4, ["#", "#", "#", "#"]),
  definePiece("line5-h", 5, ["#####"]),
  definePiece("line5-v", 5, ["#", "#", "#", "#", "#"]),

  definePiece("square2", 6, ["##", "##"]),
  definePiece("square3", 7, ["###", "###", "###"]),

  definePiece("corner2-tl", 8, ["##", "#."]),
  definePiece("corner2-tr", 8, ["##", ".#"]),
  definePiece("corner2-bl", 8, ["#.", "##"]),
  definePiece("corner2-br", 8, [".#", "##"]),

  definePiece("corner3-tl", 9, ["###", "#..", "#.."]),
  definePiece("corner3-tr", 9, ["###", "..#", "..#"]),
  definePiece("corner3-bl", 9, ["#..", "#..", "###"]),
  definePiece("corner3-br", 9, ["..#", "..#", "###"]),
];
