import { popcount } from "./bits";
import type { Board, LineMask } from "./board";
import {
  canPlace,
  canPlaceAnywhere,
  colsOf,
  createBoard,
  placeOnBoard,
  rowsOf,
} from "./board";
import type { DealAssist, WeightedPiece } from "./deal";
import { boardFill, dealTray } from "./deal";
import type { Piece } from "./pieces";
import { PIECES } from "./pieces";
import type { MoveScore, ScoringRule } from "./scoring";
import { comboScoring } from "./scoring";

export interface GameRules {
  /** Pieces that can be dealt, with relative probabilities. */
  readonly deck: readonly WeightedPiece[];
  /** Pieces dealt per round; a new round is dealt once all are placed. */
  readonly traySize: number;
  readonly scoring: ScoringRule;
  /**
   * Placements allowed after a clear for the next clear to extend the combo.
   * 1 means every placement must clear.
   */
  readonly comboWindow: number;
  /** Re-draws unplaceable trays while the board isn't too full; omit for purely random deals. */
  readonly assist?: DealAssist | undefined;
}

export const DEFAULT_RULES: GameRules = {
  deck: PIECES.map((piece) => ({ piece, weight: 1 })),
  traySize: 3,
  scoring: comboScoring,
  comboWindow: 3,
  assist: { maxFill: 70, attempts: 8, searchBudget: 600, misfitWeight: 0.25 },
};

/** Tray slot: a piece waiting to be placed, or `null` once used. */
export type TraySlot = Piece | null;

export interface GameState {
  readonly board: Board;
  readonly tray: readonly TraySlot[];
  readonly score: number;
  /** Clearing moves in the current combo; 0 when no combo is live. */
  readonly combo: number;
  /** Placements left to clear a line before the combo ends; 0 when no combo is live. */
  readonly comboMovesLeft: number;
  readonly rngState: number;
  readonly isOver: boolean;
}

/** What a successful move did — drives UI animation, sound and haptics. */
export interface MoveEvent {
  readonly piece: Piece;
  readonly row: number;
  readonly col: number;
  readonly lines: LineMask;
  readonly score: MoveScore;
  /** True if the tray was emptied and a new round dealt. */
  readonly dealt: boolean;
}

export interface MoveResult {
  readonly state: GameState;
  readonly event: MoveEvent;
}

export function newGame(
  seed: number,
  rules: GameRules = DEFAULT_RULES,
): GameState {
  const board = createBoard();
  const { tray, rngState } = deal(seed | 0, board, rules);
  return {
    board,
    tray,
    score: 0,
    combo: 0,
    comboMovesLeft: 0,
    rngState,
    isOver: false,
  };
}

/**
 * Places the tray piece at `trayIndex` with its top-left corner at
 * (`row`, `col`). Returns `null` if the move is not legal.
 */
export function placePiece(
  state: GameState,
  trayIndex: number,
  row: number,
  col: number,
  rules: GameRules = DEFAULT_RULES,
): MoveResult | null {
  const piece = state.tray[trayIndex];
  if (state.isOver || !piece || !canPlace(state.board, piece, row, col))
    return null;

  const { board, lines } = placeOnBoard(state.board, piece, row, col);
  const { combo, comboMovesLeft } = nextCombo(state, lines !== 0, rules);
  const score = rules.scoring({
    cellsPlaced: piece.cells.length,
    rowsCleared: popcount(rowsOf(lines)),
    colsCleared: popcount(colsOf(lines)),
    combo: lines === 0 ? 0 : combo,
    boardCleared: lines !== 0 && boardFill(board) === 0,
  });

  let tray = state.tray.map((slot, i) => (i === trayIndex ? null : slot));
  let rngState = state.rngState;
  const dealt = tray.every((slot) => slot === null);
  if (dealt) ({ tray, rngState } = deal(rngState, board, rules));

  return {
    state: {
      board,
      tray,
      score: state.score + score.total,
      combo,
      comboMovesLeft,
      rngState,
      isOver: !hasAnyMove(board, tray),
    },
    event: { piece, row, col, lines, score, dealt },
  };
}

function nextCombo(
  state: GameState,
  cleared: boolean,
  rules: GameRules,
): Pick<GameState, "combo" | "comboMovesLeft"> {
  if (cleared) {
    const combo = state.comboMovesLeft > 0 ? state.combo + 1 : 1;
    return { combo, comboMovesLeft: rules.comboWindow };
  }
  const comboMovesLeft = Math.max(0, state.comboMovesLeft - 1);
  return { combo: comboMovesLeft > 0 ? state.combo : 0, comboMovesLeft };
}

/** Whether any piece in the tray can still be placed. */
export function hasAnyMove(board: Board, tray: readonly TraySlot[]): boolean {
  return tray.some((piece) => piece !== null && canPlaceAnywhere(board, piece));
}

function deal(
  rngState: number,
  board: Board,
  rules: GameRules,
): { tray: TraySlot[]; rngState: number } {
  return dealTray(rngState, board, rules.traySize, rules.deck, rules.assist);
}
