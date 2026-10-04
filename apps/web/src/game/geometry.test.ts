import { PIECES } from "@ten-ten/core";
import { describe, expect, it } from "vitest";
import { ghostOrigin, measureBoard, snapCol, snapRow } from "./geometry";

const rect = { left: 20, top: 100, width: 300, height: 300 } as DOMRectReadOnly;
const geometry = measureBoard(rect, 0.1);
const dot = PIECES.find((p) => p.id === "dot");
const square3 = PIECES.find((p) => p.id === "square3");
if (!dot || !square3) throw new Error("missing test pieces");

describe("measureBoard", () => {
  it("derives pitch and inset from the board rect", () => {
    expect(geometry.pitch).toBe(30);
    expect(geometry.inset).toBe(1.5);
  });
});

describe("snapRow / snapCol", () => {
  it("snaps cell origins exactly", () => {
    expect(snapCol(geometry, 20 + 1.5 + 4 * 30)).toBe(4);
    expect(snapRow(geometry, 100 + 1.5 + 7 * 30)).toBe(7);
  });

  it("rounds to the nearest cell and allows out-of-range results", () => {
    expect(snapCol(geometry, 20 + 1.5 + 4 * 30 + 14)).toBe(4);
    expect(snapCol(geometry, 20 + 1.5 + 4 * 30 + 16)).toBe(5);
    expect(snapRow(geometry, 0)).toBeLessThan(0);
  });
});

describe("ghostOrigin", () => {
  it("centres the piece on a mouse pointer", () => {
    const out = ghostOrigin({ x: 0, y: 0 }, 200, 200, dot, geometry, 0);
    expect(out.x).toBeCloseTo(200 - 27 / 2);
    expect(out.y).toBeCloseTo(200 - 27 / 2);
  });

  it("lifts the piece above a finger", () => {
    const out = ghostOrigin({ x: 0, y: 0 }, 200, 400, square3, geometry, 1.5);
    const height = 3 * 30 - 3;
    expect(out.y).toBeCloseTo(400 - height - 45);
  });
});
