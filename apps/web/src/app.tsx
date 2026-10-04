import { useRef } from "react";
import styles from "./app.module.css";
import { BoardView } from "./components/board-view";
import { GameOver } from "./components/game-over";
import { PieceView } from "./components/piece-view";
import { Tray } from "./components/tray";
import { cssVars } from "./css-vars";
import { useDrag } from "./game/use-drag";
import { useGame } from "./game/use-game";

export function App() {
  const { state, getState, place, restart } = useGame();
  const boardRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const { drag, slotHandlers } = useDrag({
    boardRef,
    ghostRef,
    getState,
    onDrop: place,
  });

  return (
    <main className={styles.app}>
      <header className={styles.header}>
        <output className={styles.score} aria-label="Score">
          {state.score}
        </output>
        <button type="button" className={styles.restart} onClick={restart}>
          Restart
        </button>
      </header>

      <div className={styles.boardArea}>
        <BoardView ref={boardRef} board={state.board} />
      </div>

      <Tray
        tray={state.tray}
        board={state.board}
        draggingIndex={drag?.trayIndex ?? null}
        slotHandlers={slotHandlers}
      />

      {drag && (
        <PieceView
          ref={ghostRef}
          piece={drag.piece}
          className={styles.ghost}
          style={cssVars({ "--pitch": `${drag.pitch}px` })}
        />
      )}

      {state.isOver && <GameOver score={state.score} onRestart={restart} />}
    </main>
  );
}
