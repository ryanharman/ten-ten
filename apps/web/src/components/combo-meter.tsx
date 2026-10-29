import { DEFAULT_RULES, SCORING } from "@ten-ten/core";
import styles from "./combo-meter.module.css";

interface ComboMeterProps {
  readonly combo: number;
  readonly movesLeft: number;
}

const PIPS = Array.from({ length: DEFAULT_RULES.comboWindow }, (_, i) => i);

/** The multiplier the next clear will get, and the moves left to make it. */
export function ComboMeter({ combo, movesLeft }: ComboMeterProps) {
  if (combo === 0 || movesLeft === 0) return null;
  const next = Math.min(combo + 1, SCORING.maxMultiplier);
  const moves = movesLeft === 1 ? "move" : "moves";
  return (
    <output
      className={styles.meter}
      aria-label={`Combo ×${next}: clear a line within ${movesLeft} ${moves}`}
    >
      Combo <strong className={styles.multiplier}>×{next}</strong>
      <span className={styles.pips} aria-hidden="true">
        {PIPS.map((i) => (
          <span key={i} className={styles.pip} data-on={i < movesLeft} />
        ))}
      </span>
    </output>
  );
}
