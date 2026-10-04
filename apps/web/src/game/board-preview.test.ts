import { BOARD_SIZE, createBoard, PIECES, previewLines } from "@ten-ten/core";
import { beforeEach, describe, expect, it } from "vitest";
import { createBoardPreview } from "./board-preview";

function pieceById(id: string) {
  const piece = PIECES.find((p) => p.id === id);
  if (!piece) throw new Error(id);
  return piece;
}

function makeBoardEl(): HTMLElement {
  const el = document.createElement("div");
  for (let i = 0; i < BOARD_SIZE * BOARD_SIZE; i++)
    el.append(document.createElement("div"));
  return el;
}

const marked = (el: HTMLElement, attr: string) =>
  [...el.children].flatMap((cell, i) => (cell.hasAttribute(attr) ? [i] : []));

describe("createBoardPreview", () => {
  let boardEl: HTMLElement;
  beforeEach(() => {
    boardEl = makeBoardEl();
  });

  it("sets the preview colour from the piece's slot", () => {
    createBoardPreview(boardEl, pieceById("square2"));
    expect(boardEl.style.getPropertyValue("--preview-colour")).toBe(
      "var(--color-piece-6)",
    );
  });

  it("marks the cells a piece would occupy, replacing the previous preview", () => {
    const preview = createBoardPreview(boardEl, pieceById("square2"));
    preview.show(0, 0, 0);
    preview.show(4, 5, 0);
    expect(marked(boardEl, "data-preview")).toEqual([45, 46, 55, 56]);
  });

  it("marks every cell of rows and columns that would clear", () => {
    const preview = createBoardPreview(boardEl, pieceById("dot"));
    const board = createBoard();
    board.occupancy[2] = 0b1111111110;
    for (let r = 0; r < BOARD_SIZE; r++)
      if (r !== 2) board.occupancy[r] = (board.occupancy[r] ?? 0) | 1;
    preview.show(2, 0, previewLines(board, pieceById("dot"), 2, 0));
    const clear = marked(boardEl, "data-clear");
    expect(clear).toHaveLength(19);
    expect(clear).toContain(29);
    expect(clear).toContain(90);
  });

  it("clears all marks", () => {
    const preview = createBoardPreview(boardEl, pieceById("line5-h"));
    preview.show(9, 5, 0b1);
    preview.clear();
    expect(marked(boardEl, "data-preview")).toEqual([]);
    expect(marked(boardEl, "data-clear")).toEqual([]);
  });
});
