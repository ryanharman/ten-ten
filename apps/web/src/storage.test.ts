import { afterEach, describe, expect, it, vi } from "vitest";
import { readStored, writeStored } from "./storage";

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("storage", () => {
  it("round-trips namespaced values", () => {
    writeStored("best", "42");
    expect(readStored("best")).toBe("42");
    expect(localStorage.getItem("ten-ten:best")).toBe("42");
  });

  it("survives storage that throws", () => {
    vi.spyOn(localStorage, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(() => writeStored("best", "1")).not.toThrow();
    expect(readStored("best")).toBeNull();
  });
});
