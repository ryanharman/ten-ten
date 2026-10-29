import { DEFAULT_RULES, linePoints, SCORING } from "@ten-ten/core";
import styles from "./scoring-help.module.css";
import { Sheet } from "./sheet";

const LINE_COUNTS = [1, 2, 3, 4] as const;
const EXAMPLE = { lines: 2, multiplier: 3 } as const;

interface ScoringHelpProps {
  readonly onClose: () => void;
}

/** Explains the scoring rules; every number comes from the engine's `SCORING`. */
export function ScoringHelp({ onClose }: ScoringHelpProps) {
  const example = linePoints(EXAMPLE.lines);
  return (
    <Sheet title="How to score" onClose={onClose}>
      <section className={styles.rule}>
        <h3 className={styles.heading}>Place blocks</h3>
        <p className={styles.text}>
          {SCORING.cell} point for every square you place.
        </p>
      </section>

      <section className={styles.rule}>
        <h3 className={styles.heading}>Clear lines together</h3>
        <p className={styles.text}>
          Fill a row or column to clear it. Clearing several in one move scores
          far more than clearing them one at a time.
        </p>
        <dl className={styles.lines}>
          {LINE_COUNTS.map((count) => (
            <div key={count} className={styles.line}>
              <dt>
                {count} {count === 1 ? "line" : "lines"}
              </dt>
              <dd>{linePoints(count)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={styles.rule}>
        <h3 className={styles.heading}>Keep a combo going</h3>
        <p className={styles.text}>
          Clear again within {DEFAULT_RULES.comboWindow} moves of your last
          clear to build a combo. Each clear in a combo multiplies its line
          points: ×2, then ×3, up to ×{SCORING.maxMultiplier}. The meter under
          the score shows the moves you have left.
        </p>
        <p className={styles.example}>
          {EXAMPLE.lines} lines at ×{EXAMPLE.multiplier} = {example} ×{" "}
          {EXAMPLE.multiplier} = {example * EXAMPLE.multiplier}
        </p>
      </section>

      <section className={styles.rule}>
        <h3 className={styles.heading}>Clear the board</h3>
        <p className={styles.text}>
          Empty the whole board for a +{SCORING.allClear} bonus.
        </p>
      </section>
    </Sheet>
  );
}
