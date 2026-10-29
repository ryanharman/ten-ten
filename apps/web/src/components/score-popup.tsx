import type { MoveScore } from "@ten-ten/core";
import styles from "./score-popup.module.css";

interface ScorePopupProps {
  readonly score: MoveScore;
  readonly lines: number;
}

/**
 * Points for a clearing move and why: lines cleared together, combo, all
 * clear. Remount it (new `key`) per move to replay the animation; it ends
 * transparent, so it never needs a render to hide.
 */
export function ScorePopup({ score, lines }: ScorePopupProps) {
  const reasons = [
    lines > 1 && `${lines} lines`,
    score.multiplier > 1 && `Combo ×${score.multiplier}`,
    score.allClear > 0 && `All clear +${score.allClear}`,
  ].filter(Boolean);
  return (
    <div className={styles.popup} role="status">
      <strong className={styles.points}>+{score.total}</strong>
      {reasons.length > 0 && (
        <span className={styles.reasons}>{reasons.join(" · ")}</span>
      )}
    </div>
  );
}
