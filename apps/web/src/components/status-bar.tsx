import { useCallback, useState } from "react";
import { ComboMeter } from "./combo-meter";
import { ScoringHelp } from "./scoring-help";
import styles from "./status-bar.module.css";

interface StatusBarProps {
  readonly combo: number;
  readonly comboMovesLeft: number;
}

/** The row under the header: combo meter and the scoring help. */
export function StatusBar({ combo, comboMovesLeft }: StatusBarProps) {
  const [showHelp, setShowHelp] = useState(false);
  const closeHelp = useCallback(() => setShowHelp(false), []);
  return (
    <div className={styles.status}>
      <ComboMeter combo={combo} movesLeft={comboMovesLeft} />
      <button
        type="button"
        className={styles.help}
        onClick={() => setShowHelp(true)}
      >
        How to score
      </button>
      {showHelp && <ScoringHelp onClose={closeHelp} />}
    </div>
  );
}
