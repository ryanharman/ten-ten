import { useCallback, useRef } from "react";
import styles from "./app.module.css";
import { applyPendingUpdate } from "./app-update";
import { BoardView } from "./components/board-view";
import { GameOver } from "./components/game-over";
import { PieceView } from "./components/piece-view";
import { RotatePrompt } from "./components/rotate-prompt";
import { SoundToggle } from "./components/sound-toggle";
import { Tray } from "./components/tray";
import { cssVars } from "./css-vars";
import { useFeedback } from "./feedback/use-feedback";
import { useDrag } from "./game/use-drag";
import { useGame } from "./game/use-game";

export function App() {
  const { state, best, isNewBest, getState, place, restart } = useGame();
  const boardRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const trayRef = useRef<HTMLDivElement>(null);
  const { onMove, soundOn, toggleSound, unlockAudio, resetEffects } =
    useFeedback(boardRef);

  const handleDrop = useCallback(
    (trayIndex: number, row: number, col: number) => {
      const before = getState().board;
      const result = place(trayIndex, row, col);
      if (result) onMove(before, result.event, result.state.isOver);
    },
    [getState, place, onMove],
  );

  const { drag, onSlotPointerDown, cancelDrag } = useDrag({
    boardRef,
    ghostRef,
    trayRef,
    getState,
    onDrop: handleDrop,
  });

  const handleRestart = () => {
    // A new version is waiting: starting a new game is a safe moment to load it.
    if (applyPendingUpdate()) return;
    cancelDrag();
    resetEffects();
    restart();
  };

  return (
    <main className={styles.app} onPointerDown={unlockAudio}>
      <header className={styles.header}>
        <div className={styles.scores}>
          <output className={styles.score} aria-label="Score">
            {state.score}
          </output>
          <span className={styles.best}>
            Best <output aria-label="Best score">{best}</output>
          </span>
        </div>
        <div className={styles.actions}>
          <SoundToggle on={soundOn} onToggle={toggleSound} />
          <button
            type="button"
            className={styles.restart}
            onClick={handleRestart}
          >
            Restart
          </button>
        </div>
      </header>

      <div className={styles.boardArea}>
        <BoardView ref={boardRef} board={state.board} />
      </div>

      <Tray
        ref={trayRef}
        tray={state.tray}
        board={state.board}
        draggingIndex={drag?.trayIndex ?? null}
        onSlotPointerDown={onSlotPointerDown}
      />

      {drag && (
        <PieceView
          ref={ghostRef}
          piece={drag.piece}
          className={styles.ghost}
          style={cssVars({ "--pitch": `${drag.pitch}px` })}
        />
      )}

      {state.isOver && (
        <GameOver
          score={state.score}
          isNewBest={isNewBest}
          onRestart={handleRestart}
        />
      )}
      <RotatePrompt />
    </main>
  );
}
