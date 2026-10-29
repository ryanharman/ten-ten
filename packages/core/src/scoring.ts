/**
 * Scoring is a pluggable strategy so the model can change without touching
 * the rules. See docs/project-brief.md §4b.
 */
export interface ScoringEvent {
  readonly cellsPlaced: number;
  readonly rowsCleared: number;
  readonly colsCleared: number;
  /** Clearing moves in the current combo, including this one; 0 if this one cleared nothing. */
  readonly combo: number;
  /** True if this move left the board empty. */
  readonly boardCleared: boolean;
}

/** Points for one move, split so the UI can explain them. */
export interface MoveScore {
  /** Points for the blocks placed. */
  readonly placed: number;
  /** Points for lines cleared, after the combo multiplier. */
  readonly lines: number;
  /** Combo multiplier applied to `lines`; 1 when there's no combo. */
  readonly multiplier: number;
  /** Bonus for emptying the board. */
  readonly allClear: number;
  readonly total: number;
}

export type ScoringRule = (event: ScoringEvent) => MoveScore;

/**
 * The numbers behind `comboScoring`. Exported so the app's scoring help is
 * generated from the same values the engine uses.
 */
export const SCORING = {
  /** Per block placed. */
  cell: 1,
  /** Lines cleared together score `line × n²`: 10, 40, 90, 160… */
  line: 10,
  /** Highest combo multiplier. */
  maxMultiplier: 5,
  /** Bonus for a move that leaves the board empty. */
  allClear: 300,
} as const;

/** Points for clearing `count` lines in one move, before any combo. */
export function linePoints(count: number): number {
  return SCORING.line * count * count;
}

/**
 * Rewards three behaviours: clearing several lines at once (points grow with
 * the square of the count), clearing again soon after the last clear (combo
 * multiplier, see `GameRules.comboWindow`) and emptying the board.
 */
export const comboScoring: ScoringRule = ({
  cellsPlaced,
  rowsCleared,
  colsCleared,
  combo,
  boardCleared,
}) => {
  const placed = SCORING.cell * cellsPlaced;
  const multiplier = Math.max(1, Math.min(combo, SCORING.maxMultiplier));
  const lines = linePoints(rowsCleared + colsCleared) * multiplier;
  const allClear = boardCleared ? SCORING.allClear : 0;
  return {
    placed,
    lines,
    multiplier,
    allClear,
    total: placed + lines + allClear,
  };
};
