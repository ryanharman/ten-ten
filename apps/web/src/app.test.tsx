import { BOARD_SIZE } from "@ten-ten/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./app";

afterEach(cleanup);

describe("App", () => {
  it("renders an empty board, a score of 0 and three tray pieces", () => {
    const { container } = render(<App />);
    expect(screen.getByLabelText("Score").textContent).toBe("0");
    const board = container.querySelector("main > div:nth-of-type(1) > div");
    expect(board?.children).toHaveLength(BOARD_SIZE * BOARD_SIZE);
    const tray = container.querySelector("main > div:nth-of-type(2)");
    expect(tray?.children).toHaveLength(3);
  });

  it("restarts with a fresh tray", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Restart" }));
    expect(screen.getByLabelText("Score").textContent).toBe("0");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
