import { afterEach, describe, expect, it, vi } from "vitest";
import { vibrate } from "./haptics";

afterEach(() => vi.unstubAllGlobals());

describe("vibrate", () => {
  it("uses the Vibration API when available", () => {
    const spy = vi.fn();
    vi.stubGlobal("navigator", { vibrate: spy });
    vibrate("place");
    vibrate("clear");
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("is a no-op without the Vibration API (e.g. iOS Safari)", () => {
    vi.stubGlobal("navigator", {});
    expect(() => vibrate("gameOver")).not.toThrow();
  });
});
