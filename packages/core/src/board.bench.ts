import { test } from "vitest";
import { canPlace, canPlaceAnywhere, previewLines } from "./board";
import { BOARD_SIZE } from "./constants";
import { PIECES } from "./pieces";
import { boardFromAscii } from "./test-utils";

const board = boardFromAscii(
  Array.from({ length: BOARD_SIZE }, (_, r) =>
    r % 2 ? "#.#.##.#.." : ".##.#..##.",
  ),
);

test("board hot paths", async ({ bench }) => {
  await bench.compare(
    bench("canPlace — every piece at every cell", () => {
      for (const piece of PIECES) {
        for (let r = 0; r < BOARD_SIZE; r++)
          for (let c = 0; c < BOARD_SIZE; c++) canPlace(board, piece, r, c);
      }
    }),
    bench("canPlaceAnywhere — every piece", () => {
      for (const piece of PIECES) canPlaceAnywhere(board, piece);
    }),
    bench("previewLines — every piece at origin", () => {
      for (const piece of PIECES) previewLines(board, piece, 0, 0);
    }),
  );
});
