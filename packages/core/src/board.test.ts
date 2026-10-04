import { describe, expect, it } from "vitest";
import {
  canPlace,
  canPlaceAnywhere,
  colsOf,
  countLines,
  createBoard,
  placeOnBoard,
  previewLines,
  rowsOf,
} from "./board";
import { BOARD_SIZE } from "./constants";
import { boardFromAscii, boardToAscii, pieceById } from "./test-utils";

const EMPTY_ROW = "..........";

describe("canPlace", () => {
  const square2 = pieceById("square2");

  it("accepts placements inside an empty board", () => {
    const board = createBoard();
    expect(canPlace(board, square2, 0, 0)).toBe(true);
    expect(canPlace(board, square2, 8, 8)).toBe(true);
  });

  it("rejects placements out of bounds", () => {
    const board = createBoard();
    expect(canPlace(board, square2, -1, 0)).toBe(false);
    expect(canPlace(board, square2, 0, -1)).toBe(false);
    expect(canPlace(board, square2, 9, 0)).toBe(false);
    expect(canPlace(board, square2, 0, 9)).toBe(false);
  });

  it("rejects overlapping placements and allows interlocking ones", () => {
    const board = boardFromAscii(["#.........", EMPTY_ROW]);
    expect(canPlace(board, square2, 0, 0)).toBe(false);
    expect(canPlace(board, pieceById("corner2-br"), 0, 0)).toBe(true);
  });
});

describe("canPlaceAnywhere", () => {
  it("is false when no gap is large enough", () => {
    const checkerboard = Array.from({ length: BOARD_SIZE }, (_, r) =>
      r % 2 ? ".#.#.#.#.#" : "#.#.#.#.#.",
    );
    const board = boardFromAscii(checkerboard);
    expect(canPlaceAnywhere(board, pieceById("dot"))).toBe(true);
    expect(canPlaceAnywhere(board, pieceById("line2-h"))).toBe(false);
    expect(canPlaceAnywhere(board, pieceById("line2-v"))).toBe(false);
  });
});

describe("placeOnBoard", () => {
  it("places a piece without clearing anything", () => {
    const board = createBoard();
    const { board: next, lines } = placeOnBoard(
      board,
      pieceById("corner2-tl"),
      3,
      4,
    );
    expect(lines).toBe(0);
    expect(boardToAscii(next).slice(3, 5)).toEqual([
      "....##....",
      "....#.....",
    ]);
    expect(next.colours[3 * BOARD_SIZE + 4]).toBe(
      pieceById("corner2-tl").colour,
    );
  });

  it("does not mutate the input board", () => {
    const board = createBoard();
    placeOnBoard(board, pieceById("square3"), 0, 0);
    expect(boardToAscii(board).every((row) => row === EMPTY_ROW)).toBe(true);
  });

  it("clears a completed row", () => {
    const board = boardFromAscii(["#####.....", "#........."]);
    const { board: next, lines } = placeOnBoard(
      board,
      pieceById("line5-h"),
      0,
      5,
    );
    expect(rowsOf(lines)).toBe(0b1);
    expect(colsOf(lines)).toBe(0);
    expect(boardToAscii(next).slice(0, 2)).toEqual([EMPTY_ROW, "#........."]);
    expect(next.colours.slice(0, BOARD_SIZE).every((c) => c === 0)).toBe(true);
  });

  it("clears a completed column", () => {
    const art = Array.from({ length: BOARD_SIZE }, (_, r) =>
      r < 5 ? "..#......." : EMPTY_ROW,
    );
    const { board: next, lines } = placeOnBoard(
      boardFromAscii(art),
      pieceById("line5-v"),
      5,
      2,
    );
    expect(colsOf(lines)).toBe(1 << 2);
    expect(rowsOf(lines)).toBe(0);
    expect(boardToAscii(next).every((row) => row === EMPTY_ROW)).toBe(true);
  });

  it("clears a row and column simultaneously, including their intersection", () => {
    const art = Array.from({ length: BOARD_SIZE }, (_, r) => {
      if (r === 0) return ".#########";
      return r === 1 ? "#........#" : "#.........";
    });
    const { board: next, lines } = placeOnBoard(
      boardFromAscii(art),
      pieceById("dot"),
      0,
      0,
    );
    expect(countLines(lines)).toBe(2);
    expect(rowsOf(lines)).toBe(0b1);
    expect(colsOf(lines)).toBe(0b1);
    expect(boardToAscii(next).slice(0, 3)).toEqual([
      EMPTY_ROW,
      ".........#",
      EMPTY_ROW,
    ]);
  });
});

describe("previewLines", () => {
  it("matches the lines placeOnBoard clears", () => {
    const board = boardFromAscii(["########..", "########.."]);
    const square2 = pieceById("square2");
    const preview = previewLines(board, square2, 0, 8);
    expect(rowsOf(preview)).toBe(0b11);
    expect(preview).toBe(placeOnBoard(board, square2, 0, 8).lines);
  });
});
