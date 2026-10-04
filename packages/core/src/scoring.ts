/**
 * Scoring is a pluggable strategy so the model can change without touching
 * the rules. See docs/project-brief.md (scoring is still TBD).
 */
export interface ScoringEvent {
  readonly cellsPlaced: number;
  readonly rowsCleared: number;
  readonly colsCleared: number;
  /** Consecutive placements (including this one) that cleared ≥1 line; 0 if this one cleared none. */
  readonly streak: number;
}

export type ScoringRule = (event: ScoringEvent) => number;

/**
 * Placeholder: 1 point per cell placed, plus a triangular bonus for lines
 * cleared in one move (1 line = 10, 2 = 30, 3 = 60, ...).
 */
export const classicScoring: ScoringRule = ({
  cellsPlaced,
  rowsCleared,
  colsCleared,
}) => {
  const lines = rowsCleared + colsCleared;
  return cellsPlaced + (10 * lines * (lines + 1)) / 2;
};
