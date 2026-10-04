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
import type { Piece } from "./pieces";
import { PIECES } from "./pieces";
import { nextRandom } from "./rng";
import type { ScoringRule } from "./scoring";
import { classicScoring } from "./scoring";

export interface WeightedPiece {
  readonly piece: Piece;
  readonly weight: number;
}

export interface GameRules {
  /** Pieces that can be dealt, with relative probabilities. */
  readonly deck: readonly WeightedPiece[];
  /** Pieces dealt per round; a new round is dealt once all are placed. */
  readonly traySize: number;
  readonly scoring: ScoringRule;
}

export const DEFAULT_RULES: GameRules = {
  deck: PIECES.map((piece) => ({ piece, weight: 1 })),
  traySize: 3,
  scoring: classicScoring,
};

/** Tray slot: a piece waiting to be placed, or `null` once used. */
export type TraySlot = Piece | null;

export interface GameState {
  readonly board: Board;
  readonly tray: readonly TraySlot[];
  readonly score: number;
  /** Consecutive placements that cleared at least one line. */
  readonly streak: number;
  readonly rngState: number;
  readonly isOver: boolean;
}

/** What a successful move did — drives UI animation, sound and haptics. */
export interface MoveEvent {
  readonly piece: Piece;
  readonly row: number;
  readonly col: number;
  readonly lines: LineMask;
  readonly points: number;
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
  const { tray, rngState } = dealTray(seed | 0, rules);
  return {
    board: createBoard(),
    tray,
    score: 0,
    streak: 0,
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
  const streak = lines === 0 ? 0 : state.streak + 1;
  const points = rules.scoring({
    cellsPlaced: piece.cells.length,
    rowsCleared: popcount(rowsOf(lines)),
    colsCleared: popcount(colsOf(lines)),
    streak,
  });

  let tray = state.tray.map((slot, i) => (i === trayIndex ? null : slot));
  let rngState = state.rngState;
  const dealt = tray.every((slot) => slot === null);
  if (dealt) ({ tray, rngState } = dealTray(rngState, rules));

  return {
    state: {
      board,
      tray,
      score: state.score + points,
      streak,
      rngState,
      isOver: !hasAnyMove(board, tray),
    },
    event: { piece, row, col, lines, points, dealt },
  };
}

/** Whether any piece in the tray can still be placed. */
export function hasAnyMove(board: Board, tray: readonly TraySlot[]): boolean {
  return tray.some((piece) => piece !== null && canPlaceAnywhere(board, piece));
}

function dealTray(
  rngState: number,
  rules: GameRules,
): { tray: TraySlot[]; rngState: number } {
  const totalWeight = rules.deck.reduce((sum, entry) => sum + entry.weight, 0);
  const tray: TraySlot[] = [];
  let state = rngState;
  for (let i = 0; i < rules.traySize; i++) {
    const step = nextRandom(state);
    state = step.state;
    tray.push(pickWeighted(rules.deck, step.value * totalWeight));
  }
  return { tray, rngState: state };
}

function pickWeighted(deck: readonly WeightedPiece[], target: number): Piece {
  let remaining = target;
  for (const entry of deck) {
    remaining -= entry.weight;
    if (remaining < 0) return entry.piece;
  }
  const last = deck[deck.length - 1];
  if (!last) throw new Error("Game rules have an empty deck");
  return last.piece;
}
