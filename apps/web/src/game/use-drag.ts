import type { GameState } from "@ten-ten/core";
import { foundation } from "@ten-ten/tokens";
import type { PointerEvent, RefObject } from "react";
import { useRef, useState } from "react";
import type { DragController, DragView } from "./drag-controller";
import { createDragController } from "./drag-controller";

interface DragOptions {
  readonly boardRef: RefObject<HTMLDivElement | null>;
  readonly ghostRef: RefObject<HTMLDivElement | null>;
  readonly getState: () => GameState;
  /** Must be stable across renders (the controller is created once). */
  readonly onDrop: (trayIndex: number, row: number, col: number) => void;
}

/** React binding for the drag controller: pointer handlers per tray slot. */
export function useDrag({ boardRef, ghostRef, getState, onDrop }: DragOptions) {
  const [drag, setDrag] = useState<DragView | null>(null);
  const controllerRef = useRef<DragController | null>(null);
  controllerRef.current ??= createDragController({
    getBoard: () => boardRef.current,
    getGhost: () => ghostRef.current,
    getState,
    gapRatio: foundation.boardGapRatio,
    onChange: setDrag,
    onDrop,
  });
  const controller = controllerRef.current;

  const slotHandlers = (trayIndex: number) => ({
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      if (!e.isPrimary || !controller.start(trayIndex, e)) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => controller.move(e),
    onPointerUp: (e: PointerEvent<HTMLElement>) =>
      controller.end(e.pointerId, true),
    onPointerCancel: (e: PointerEvent<HTMLElement>) =>
      controller.end(e.pointerId, false),
  });

  return { drag, slotHandlers };
}
