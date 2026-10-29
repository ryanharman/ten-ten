export type { Board, LineMask, Placement } from "./board";
export {
  canPlace,
  canPlaceAnywhere,
  colsOf,
  countLines,
  createBoard,
  placeOnBoard,
  previewLines,
  rowsOf,
} from "./board";
export { BOARD_SIZE } from "./constants";
export type { DealAssist, WeightedPiece } from "./deal";
export type {
  GameRules,
  GameState,
  MoveEvent,
  MoveResult,
  TraySlot,
} from "./game";
export { DEFAULT_RULES, hasAnyMove, newGame, placePiece } from "./game";
export type { Cell, ColourSlot, Piece } from "./pieces";
export { PIECES } from "./pieces";
export type { MoveScore, ScoringEvent, ScoringRule } from "./scoring";
export { comboScoring, linePoints, SCORING } from "./scoring";
export type { SavedGame } from "./serialize";
export { deserializeGame, serializeGame } from "./serialize";
