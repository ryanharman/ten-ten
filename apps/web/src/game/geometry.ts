import type { Piece } from "@ten-ten/core";
import { BOARD_SIZE } from "@ten-ten/core";

/**
 * Board layout in viewport pixels. The board is a grid with `gap` between
 * cells and `gap / 2` padding, so cell (r, c) starts at
 * `left + inset + c * pitch` and `pitch = width / BOARD_SIZE` exactly.
 */
export interface BoardGeometry {
  readonly left: number;
  readonly top: number;
  /** Cell size plus gap. */
  readonly pitch: number;
  /** Half the gap: padding between the board edge and the first cell. */
  readonly inset: number;
}

export function measureBoard(
  rect: DOMRectReadOnly,
  gapRatio: number,
): BoardGeometry {
  const pitch = rect.width / BOARD_SIZE;
  return {
    left: rect.left,
    top: rect.top,
    pitch,
    inset: (pitch * gapRatio) / 2,
  };
}

/** Mutable point, reused across frames to avoid per-frame allocation. */
export interface Point {
  x: number;
  y: number;
}

/**
 * Where the dragged piece's top-left cell should be drawn for a pointer at
 * (`pointerX`, `pointerY`): centred horizontally, and lifted `liftCells`
 * above the pointer so a finger doesn't hide it.
 */
export function ghostOrigin(
  out: Point,
  pointerX: number,
  pointerY: number,
  piece: Piece,
  geometry: BoardGeometry,
  liftCells: number,
): Point {
  const gap = geometry.inset * 2;
  const width = piece.width * geometry.pitch - gap;
  const height = piece.height * geometry.pitch - gap;
  out.x = pointerX - width / 2;
  out.y =
    liftCells > 0
      ? pointerY - height - liftCells * geometry.pitch
      : pointerY - height / 2;
  return out;
}

/** Nearest board row for a piece whose top-left cell is drawn at viewport `y`. */
export function snapRow(geometry: BoardGeometry, y: number): number {
  return Math.round((y - geometry.top - geometry.inset) / geometry.pitch);
}

/** Nearest board column for a piece whose top-left cell is drawn at viewport `x`. */
export function snapCol(geometry: BoardGeometry, x: number): number {
  return Math.round((x - geometry.left - geometry.inset) / geometry.pitch);
}
