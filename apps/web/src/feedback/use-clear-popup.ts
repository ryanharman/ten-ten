import type { MoveEvent, MoveScore } from "@ten-ten/core";
import { countLines } from "@ten-ten/core";
import { useCallback, useState } from "react";

/** The latest clearing move's points; `id` changes per clear to replay the popup. */
interface ClearPopup {
  readonly id: number;
  readonly score: MoveScore;
  readonly lines: number;
}

/**
 * State for the score popup. Call `show` in the same handler as the move so
 * React batches it with the move's own update: still one render per drop.
 */
export function useClearPopup() {
  const [popup, setPopup] = useState<ClearPopup | null>(null);
  const show = useCallback((event: MoveEvent) => {
    if (event.lines === 0) return;
    setPopup((prev) => ({
      id: (prev?.id ?? 0) + 1,
      score: event.score,
      lines: countLines(event.lines),
    }));
  }, []);
  const hide = useCallback(() => setPopup(null), []);
  return { popup, show, hide };
}
