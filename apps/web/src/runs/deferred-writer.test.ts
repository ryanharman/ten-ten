import { afterEach, describe, expect, it, vi } from "vitest";
import { createDeferredWriter } from "./deferred-writer";

afterEach(() => vi.useRealTimers());

describe("createDeferredWriter", () => {
  it("coalesces scheduled values and writes the latest when idle", () => {
    vi.useFakeTimers();
    const write = vi.fn();
    const writer = createDeferredWriter(write);
    writer.schedule(1);
    writer.schedule(2);
    expect(write).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(write).toHaveBeenCalledExactlyOnceWith(2);
    writer.dispose();
  });

  it("flushes immediately when the page is hidden or unloaded", () => {
    const write = vi.fn();
    const writer = createDeferredWriter(write);
    writer.schedule("a");
    window.dispatchEvent(new Event("pagehide"));
    expect(write).toHaveBeenLastCalledWith("a");
    writer.schedule("b");
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    document.dispatchEvent(new Event("visibilitychange"));
    expect(write).toHaveBeenLastCalledWith("b");
    writer.dispose();
    vi.restoreAllMocks();
  });

  it("does nothing on flush when nothing is pending, and flushes on dispose", () => {
    const write = vi.fn();
    const writer = createDeferredWriter(write);
    writer.flush();
    expect(write).not.toHaveBeenCalled();
    writer.schedule(3);
    writer.dispose();
    expect(write).toHaveBeenCalledExactlyOnceWith(3);
  });
});
