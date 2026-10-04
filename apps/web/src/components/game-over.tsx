import styles from "./game-over.module.css";

interface GameOverProps {
  readonly score: number;
  readonly isNewBest: boolean;
  readonly onRestart: () => void;
  readonly onShowRuns: () => void;
}

export function GameOver({
  score,
  isNewBest,
  onRestart,
  onShowRuns,
}: GameOverProps) {
  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-over-title"
    >
      <div className={styles.panel}>
        <h2 id="game-over-title" className={styles.title}>
          No moves left
        </h2>
        <p className={styles.score}>{score}</p>
        {isNewBest && <p className={styles.best}>New best!</p>}
        <button type="button" className={styles.button} onClick={onRestart}>
          Play again
        </button>
        <button type="button" className={styles.link} onClick={onShowRuns}>
          See runs
        </button>
      </div>
    </div>
  );
}
