import { describe, expect, it } from "vitest";
import { PIECES } from "./pieces";

describe("PIECES", () => {
  it("contains the 19 classic shapes with unique ids", () => {
    expect(PIECES).toHaveLength(19);
    expect(new Set(PIECES.map((p) => p.id)).size).toBe(19);
  });

  it("has distinct shapes", () => {
    const shapes = PIECES.map((p) => p.rowMasks.join(","));
    expect(new Set(shapes).size).toBe(PIECES.length);
  });

  it("keeps cells, masks and dimensions consistent", () => {
    for (const piece of PIECES) {
      expect(piece.rowMasks).toHaveLength(piece.height);
      const maskCells = piece.rowMasks.reduce(
        (n, mask) => n + mask.toString(2).replaceAll("0", "").length,
        0,
      );
      expect(maskCells).toBe(piece.cells.length);
      for (const cell of piece.cells) {
        expect(cell.row).toBeLessThan(piece.height);
        expect(cell.col).toBeLessThan(piece.width);
      }
    }
  });
});
