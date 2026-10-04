import type { Board, ColourSlot } from "@ten-ten/core";
import { BOARD_SIZE } from "@ten-ten/core";
import { pieceColourVar } from "@ten-ten/tokens";
import type { ReactElement, Ref } from "react";
import { memo } from "react";
import { cssVars } from "../css-vars";
import styles from "./board-view.module.css";

interface BoardViewProps {
  readonly board: Board;
  readonly ref?: Ref<HTMLDivElement>;
}

/**
 * Renders the 10×10 grid. Children must stay exactly one element per cell in
 * row-major order: the drag preview addresses cells by child index.
 */
export const BoardView = memo(function BoardView({
  board,
  ref,
}: BoardViewProps) {
  const cells: ReactElement[] = [];
  for (let i = 0; i < BOARD_SIZE * BOARD_SIZE; i++) {
    const colour = board.colours[i];
    cells.push(
      <div
        key={i}
        className={styles.cell}
        style={
          colour
            ? cssVars({ "--cell-colour": pieceColourVar(colour as ColourSlot) })
            : undefined
        }
      />,
    );
  }
  return (
    <div
      ref={ref}
      className={styles.board}
      style={cssVars({ "--cells": String(BOARD_SIZE) })}
    >
      {cells}
    </div>
  );
});
