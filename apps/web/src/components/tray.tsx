import type { Board, TraySlot } from "@ten-ten/core";
import { canPlaceAnywhere } from "@ten-ten/core";
import type { PointerEventHandler } from "react";
import { PieceView } from "./piece-view";
import styles from "./tray.module.css";

interface SlotHandlers {
  readonly onPointerDown: PointerEventHandler<HTMLElement>;
  readonly onPointerMove: PointerEventHandler<HTMLElement>;
  readonly onPointerUp: PointerEventHandler<HTMLElement>;
  readonly onPointerCancel: PointerEventHandler<HTMLElement>;
}

interface TrayProps {
  readonly tray: readonly TraySlot[];
  readonly board: Board;
  readonly draggingIndex: number | null;
  readonly slotHandlers: (trayIndex: number) => SlotHandlers;
}

export function Tray({ tray, board, draggingIndex, slotHandlers }: TrayProps) {
  return (
    <div className={styles.tray}>
      {tray.map((piece, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: tray slots are fixed positions
          key={i}
          className={styles.slot}
          data-dragging={draggingIndex === i || undefined}
          data-blocked={(piece && !canPlaceAnywhere(board, piece)) || undefined}
          {...slotHandlers(i)}
        >
          {piece && <PieceView piece={piece} />}
        </div>
      ))}
    </div>
  );
}
