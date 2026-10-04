import type { Board, TraySlot } from "@ten-ten/core";
import { canPlaceAnywhere } from "@ten-ten/core";
import type { PointerEvent, Ref } from "react";
import { PieceView } from "./piece-view";
import styles from "./tray.module.css";

interface TrayProps {
  readonly tray: readonly TraySlot[];
  readonly board: Board;
  readonly draggingIndex: number | null;
  readonly onSlotPointerDown: (
    trayIndex: number,
    e: PointerEvent<HTMLElement>,
  ) => void;
  /** Slot elements are the tray's children, in order (used to animate drops back). */
  readonly ref?: Ref<HTMLDivElement>;
}

export function Tray({
  tray,
  board,
  draggingIndex,
  onSlotPointerDown,
  ref,
}: TrayProps) {
  return (
    <div ref={ref} className={styles.tray}>
      {tray.map((piece, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: tray slots are fixed positions
          key={i}
          className={styles.slot}
          data-dragging={draggingIndex === i || undefined}
          data-blocked={(piece && !canPlaceAnywhere(board, piece)) || undefined}
          onPointerDown={(e) => onSlotPointerDown(i, e)}
        >
          {piece && <PieceView piece={piece} />}
        </div>
      ))}
    </div>
  );
}
