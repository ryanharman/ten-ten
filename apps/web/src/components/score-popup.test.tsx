import type { MoveScore } from "@ten-ten/core";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ScorePopup } from "./score-popup";

afterEach(cleanup);

const score = (overrides: Partial<MoveScore>): MoveScore => ({
  placed: 3,
  lines: 10,
  multiplier: 1,
  allClear: 0,
  total: 13,
  ...overrides,
});

describe("ScorePopup", () => {
  it("shows just the points for a plain clear", () => {
    render(<ScorePopup score={score({})} lines={1} />);
    expect(screen.getByRole("status").textContent).toBe("+13");
  });

  it("explains bonuses", () => {
    render(
      <ScorePopup
        score={score({ multiplier: 3, allClear: 300, total: 423 })}
        lines={2}
      />,
    );
    expect(screen.getByRole("status").textContent).toBe(
      "+4232 lines · Combo ×3 · All clear +300",
    );
  });
});
