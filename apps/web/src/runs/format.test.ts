import { describe, expect, it } from "vitest";
import { formatDate, formatDuration } from "./format";

describe("formatDuration", () => {
  it.each([
    [0, "0s"],
    [45_000, "45s"],
    [185_000, "3m 05s"],
    [3_720_000, "1h 02m"],
  ])("%i ms → %s", (ms, text) => {
    expect(formatDuration(ms)).toBe(text);
  });
});

describe("formatDate", () => {
  it("includes the day and time", () => {
    const text = formatDate(new Date(2026, 9, 4, 10, 12).getTime());
    expect(text).toMatch(/4/);
    expect(text).toMatch(/10.?12/);
  });
});
