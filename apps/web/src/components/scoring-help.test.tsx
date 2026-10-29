import { linePoints, SCORING } from "@ten-ten/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScoringHelp } from "./scoring-help";

afterEach(cleanup);

describe("ScoringHelp", () => {
  it("lists the engine's scoring values", () => {
    render(<ScoringHelp onClose={() => {}} />);
    const dialog = screen.getByRole("dialog", { name: "How to score" });
    expect(dialog.textContent).toContain(`${linePoints(4)}`);
    expect(dialog.textContent).toContain(`up to ×${SCORING.maxMultiplier}`);
    expect(dialog.textContent).toContain(`+${SCORING.allClear} bonus`);
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    render(<ScoringHelp onClose={onClose} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
