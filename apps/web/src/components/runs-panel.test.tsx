import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RunRecord } from "../runs/run-recorder";
import { startRun, summariseRun } from "../runs/run-recorder";
import { RunsPanel } from "./runs-panel";

afterEach(cleanup);

const run = (
  id: string,
  score: number,
  outcome: RunRecord["outcome"] = "completed",
): RunRecord => ({
  ...summariseRun(startRun(0, 0), outcome, 1_000),
  id,
  score,
});

describe("RunsPanel", () => {
  it("shows an empty state", () => {
    render(<RunsPanel history={[]} onClose={() => {}} />);
    expect(screen.getByText(/No runs yet/)).toBeTruthy();
  });

  it("shows summary stats, top scores and recent runs (with quits marked)", () => {
    const history = [run("c", 30, "abandoned"), run("b", 90), run("a", 60)];
    render(<RunsPanel history={history} onClose={() => {}} />);
    const top = screen.getByRole("table", { name: "Top scores" });
    const topScores = within(top)
      .getAllByRole("row")
      .slice(1)
      .map((row) => within(row).getAllByRole("cell")[1]?.textContent);
    expect(topScores).toEqual(["90", "60", "30"]);
    const recent = screen.getByRole("table", { name: "Recent runs" });
    expect(within(recent).getAllByRole("row")).toHaveLength(4);
    expect(within(recent).getByText("quit")).toBeTruthy();
    // Games/average count completed runs only.
    expect(screen.getByText("Games").nextElementSibling?.textContent).toBe("2");
    expect(screen.getByText("Average").nextElementSibling?.textContent).toBe(
      "75",
    );
  });

  it("closes from the button and the Escape key", () => {
    const onClose = vi.fn();
    render(<RunsPanel history={[]} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
