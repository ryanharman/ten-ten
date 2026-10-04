import type { Piece } from "@ten-ten/core";
import { pieceColourVar } from "@ten-ten/tokens";
import type { CSSProperties, Ref } from "react";
import { cssVars } from "../css-vars";
import styles from "./piece-view.module.css";

interface PieceViewProps {
  readonly piece: Piece;
  /** Size comes from the `--pitch` CSS variable, set by the container or `style`. */
  readonly className?: string | undefined;
  readonly style?: CSSProperties;
  readonly ref?: Ref<HTMLDivElement>;
}

export function PieceView({ piece, className, style, ref }: PieceViewProps) {
  return (
    <div
      ref={ref}
      className={className ? `${styles.piece} ${className}` : styles.piece}
      style={{
        ...cssVars({
          "--cols": String(piece.width),
          "--rows": String(piece.height),
          "--piece-colour": pieceColourVar(piece.colour),
        }),
        ...style,
      }}
    >
      {piece.cells.map((cell) => (
        <div
          key={`${cell.row}-${cell.col}`}
          className={styles.cell}
          style={{ gridRow: cell.row + 1, gridColumn: cell.col + 1 }}
        />
      ))}
    </div>
  );
}
