import { test } from "vitest";
import { dealTray } from "./deal";
import { DEFAULT_RULES } from "./game";
import { boardFromAscii } from "./test-utils";

// Half full with only 2×2 holes: big pieces never fit, so many trays get re-drawn.
const fragmented = boardFromAscii([
  "##..##..##",
  "##..##..##",
  "..##..##..",
  "..##..##..",
  "##..##..##",
  "##..##..##",
  "..##..##..",
  "..##..##..",
  "##..##..##",
  "##..##..##",
]);

test("dealing", async ({ bench }) => {
  const { traySize, deck, assist } = DEFAULT_RULES;
  let seed = 0;
  await bench.compare(
    bench("assisted deal — fragmented board", () => {
      dealTray(seed++, fragmented, traySize, deck, assist);
    }),
    bench("random deal — fragmented board", () => {
      dealTray(seed++, fragmented, traySize, deck);
    }),
  );
});
