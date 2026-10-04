/**
 * Coalesces writes and runs them when the browser is idle, keeping storage
 * work off the move → paint path. Pending writes are flushed immediately when
 * the page is hidden or unloaded, so a closed tab never loses the last move.
 */
export interface DeferredWriter<T> {
  schedule(value: T): void;
  flush(): void;
  dispose(): void;
}

export function createDeferredWriter<T>(
  write: (value: T) => void,
  target: Window = window,
): DeferredWriter<T> {
  let pending: { value: T } | null = null;
  let handle: number | null = null;
  const idle = typeof target.requestIdleCallback === "function";

  const cancel = () => {
    if (handle === null) return;
    if (idle) target.cancelIdleCallback(handle);
    else target.clearTimeout(handle);
    handle = null;
  };

  const flush = () => {
    cancel();
    if (!pending) return;
    const { value } = pending;
    pending = null;
    write(value);
  };

  const onHide = () => {
    if (target.document.visibilityState === "hidden") flush();
  };
  target.addEventListener("pagehide", flush);
  target.document.addEventListener("visibilitychange", onHide);

  return {
    schedule(value) {
      pending = { value };
      if (handle !== null) return;
      handle = idle
        ? target.requestIdleCallback(flush, { timeout: 1000 })
        : target.setTimeout(flush, 250);
    },
    flush,
    dispose() {
      flush();
      target.removeEventListener("pagehide", flush);
      target.document.removeEventListener("visibilitychange", onHide);
    },
  };
}
