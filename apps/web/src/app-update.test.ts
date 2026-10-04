import { describe, expect, it, vi } from "vitest";
import { applyPendingUpdate, setPendingUpdate } from "./app-update";

describe("appUpdate", () => {
  it("applies a pending update exactly once", () => {
    expect(applyPendingUpdate()).toBe(false);
    const apply = vi.fn();
    setPendingUpdate(apply);
    expect(applyPendingUpdate()).toBe(true);
    expect(applyPendingUpdate()).toBe(false);
    expect(apply).toHaveBeenCalledOnce();
  });
});
