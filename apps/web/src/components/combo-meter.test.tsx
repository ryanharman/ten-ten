import { SCORING } from "@ten-ten/core";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ComboMeter } from "./combo-meter";

afterEach(cleanup);

describe("ComboMeter", () => {
  it("is hidden without a live combo", () => {
    const { container } = render(<ComboMeter combo={0} movesLeft={0} />);
    expect(container.childElementCount).toBe(0);
    render(<ComboMeter combo={3} movesLeft={0} />);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("shows the next clear's multiplier and the moves left", () => {
    const { container } = render(<ComboMeter combo={1} movesLeft={1} />);
    const meter = screen.getByRole("status");
    expect(meter.getAttribute("aria-label")).toBe(
      "Combo ×2: clear a line within 1 move",
    );
    const pips = [...container.querySelectorAll("[data-on]")];
    expect(pips.map((p) => p.getAttribute("data-on"))).toEqual([
      "true",
      "false",
      "false",
    ]);
  });

  it("caps the multiplier", () => {
    render(<ComboMeter combo={SCORING.maxMultiplier + 2} movesLeft={3} />);
    expect(screen.getByRole("status").getAttribute("aria-label")).toBe(
      `Combo ×${SCORING.maxMultiplier}: clear a line within 3 moves`,
    );
  });
});
