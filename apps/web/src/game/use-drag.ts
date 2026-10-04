import type { GameState } from "@ten-ten/core";
import { foundation } from "@ten-ten/tokens";
import type { PointerEvent, RefObject } from "react";
import { useRef, useState } from "react";
import { prefersReducedMotion } from "../motion";
import type { DragController, DragView } from "./drag-controller";
import { createDragController } from "./drag-controller";
import { createReturnAnimation } from "./return-animation";

interface DragOptions {
  readonly boardRef: RefObject<HTMLDivElement | null>;
  readonly ghostRef: RefObject<HTMLDivElement | null>;
  readonly trayRef: RefObject<HTMLDivElement | null>;
  readonly getState: () => GameState;
  /** Must be stable across renders (the controller is created once). */
  readonly onDrop: (trayIndex: number, row: number, col: number) => void;
}

/** React binding for the drag controller. */
export function useDrag({
  boardRef,
  ghostRef,
  trayRef,
  getState,
  onDrop,
}: DragOptions) {
  const [drag, setDrag] = useState<DragView | null>(null);
  const controllerRef = useRef<DragController | null>(null);
  controllerRef.current ??= createDragController({
    getBoard: () => boardRef.current,
    getGhost: () => ghostRef.current,
    getState,
    gapRatio: foundation.boardGapRatio,
    pointerTarget: window,
    onChange: setDrag,
    onDrop,
    animateReturn: createReturnAnimation(
      (i) => trayRef.current?.children[i]?.firstElementChild ?? null,
      prefersReducedMotion,
    ),
  });
  const controller = controllerRef.current;

  const onSlotPointerDown = (
    trayIndex: number,
    e: PointerEvent<HTMLElement>,
  ) => {
    if (e.isPrimary && controller.start(trayIndex, e)) e.preventDefault();
  };

  return { drag, onSlotPointerDown, cancelDrag: controller.cancel };
}
