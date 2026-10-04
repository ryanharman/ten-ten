import { BOARD_SIZE, newGame, placePiece } from "@ten-ten/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./app";
import { recordMove, startRun } from "./runs/run-recorder";
import { loadHistory, saveSession } from "./runs/run-store";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("App", () => {
  it("renders an empty board, a score of 0 and three tray pieces", () => {
    const { container } = render(<App />);
    expect(screen.getByLabelText("Score").textContent).toBe("0");
    const board = container.querySelector("main > div:nth-of-type(1) > div");
    expect(board?.children).toHaveLength(BOARD_SIZE * BOARD_SIZE);
    const tray = container.querySelector("main > div:nth-of-type(2)");
    expect(tray?.children).toHaveLength(3);
  });

  it("shows the stored best score", () => {
    localStorage.setItem("ten-ten:best", "123");
    render(<App />);
    expect(screen.getByLabelText("Best score").textContent).toBe("123");
  });

  it("restarts with a fresh tray", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Restart" }));
    expect(screen.getByLabelText("Score").textContent).toBe("0");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("toggles and persists the sound setting", () => {
    render(<App />);
    const toggle = screen.getByRole("button", { name: "Sound" });
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    expect(localStorage.getItem("ten-ten:sound")).toBe("off");
  });

  it("restores a game in progress from a previous session", () => {
    const moved = placePiece(newGame(5), 0, 0, 0);
    if (!moved) throw new Error("move should be legal");
    saveSession({
      state: moved.state,
      run: recordMove(startRun(0, 0), moved.event, 10),
    });
    const { container } = render(<App />);
    expect(screen.getByLabelText("Score").textContent).toBe(
      String(moved.state.score),
    );
    const filled = [
      ...(container.querySelector("main > div:nth-of-type(1) > div")
        ?.children ?? []),
    ].filter((cell) =>
      (cell as HTMLElement).style.getPropertyValue("--cell-colour"),
    );
    expect(filled).toHaveLength(moved.event.piece.cells.length);
  });

  it("records a restarted game as an abandoned run and opens the runs panel", () => {
    const moved = placePiece(newGame(5), 0, 0, 0);
    if (!moved) throw new Error("move should be legal");
    saveSession({
      state: moved.state,
      run: recordMove(startRun(0, 0), moved.event, 10),
    });
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Restart" }));
    expect(loadHistory()).toMatchObject([{ outcome: "abandoned", moves: 1 }]);
    // The new game's save is deferred until idle or the page is hidden.
    window.dispatchEvent(new Event("pagehide"));
    expect(
      JSON.parse(localStorage.getItem("ten-ten:session") ?? "{}").game.score,
    ).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "Runs" }));
    expect(screen.getByRole("table", { name: "Recent runs" })).toBeTruthy();
  });
});
