import { popcount } from "./bits";
import type { Board } from "./board";
import { canPlace, canPlaceAnywhere, previewLines } from "./board";
import { BOARD_SIZE, FULL_LINE } from "./constants";
import type { Piece } from "./pieces";
import { nextRandom } from "./rng";

export interface WeightedPiece {
  readonly piece: Piece;
  readonly weight: number;
}

/**
 * Assisted dealing. Purely random deals often hand the player a tray that
 * cannot all be placed even with perfect play while the board is only half
 * full, which ends the game through no fault of theirs. Below `maxFill`, the
 * dealer re-draws such trays.
 */
export interface DealAssist {
  /** Occupied cells (0–100) above which deals are left purely random. */
  readonly maxFill: number;
  /** Trays drawn before giving up and dealing the last one anyway. */
  readonly attempts: number;
  /**
   * Placements the solver may try per deal, across all attempts, before
   * accepting the current tray. Bounds the cost of a deal on the drop path.
   */
  readonly searchBudget: number;
  /** Weight multiplier for pieces that don't fit anywhere on the board right now. */
  readonly misfitWeight: number;
}

export function boardFill(board: Board): number {
  let filled = 0;
  for (let r = 0; r < BOARD_SIZE; r++)
    filled += popcount(board.occupancy[r] ?? 0);
  return filled;
}

const NO_COLOURS = new Uint8Array(0);
/** One scratch board per search depth, so the search doesn't allocate. */
const scratch: Board[] = [];

/** Writes the occupancy after placing `piece` and clearing lines into `out`. */
function placeInto(
  out: Uint16Array,
  board: Board,
  piece: Piece,
  row: number,
  col: number,
): void {
  const lines = previewLines(board, piece, row, col);
  const rows = lines & FULL_LINE;
  const cols = ~(lines >>> BOARD_SIZE) & FULL_LINE;
  for (let r = 0; r < BOARD_SIZE; r++) {
    const pieceRow = r - row;
    let mask = board.occupancy[r] ?? 0;
    if (pieceRow >= 0 && pieceRow < piece.height)
      mask |= (piece.rowMasks[pieceRow] ?? 0) << col;
    out[r] = (rows >>> r) & 1 ? 0 : mask & cols;
  }
}

/** Candidate placements the current search may still try before giving up. */
let work = 0;

/**
 * Whether every piece can be placed, in some order, counting the space freed
 * by lines cleared along the way. Exhaustive but stops at the first solution.
 * After trying `maxWork` candidate placements it gives up and answers `true`.
 */
export function canPlaceAll(
  board: Board,
  pieces: readonly Piece[],
  maxWork = Number.POSITIVE_INFINITY,
): boolean {
  work = maxWork;
  return search(board, pieces, 0, 0);
}

/** Fewest empty cells in any row or column: the least it takes to clear a line. */
function smallestGap(board: Board): number {
  let gap = BOARD_SIZE;
  for (let r = 0; r < BOARD_SIZE; r++) {
    gap = Math.min(gap, BOARD_SIZE - popcount(board.occupancy[r] ?? 0));
  }
  for (let c = 0; c < BOARD_SIZE; c++) {
    let filled = 0;
    for (let r = 0; r < BOARD_SIZE; r++)
      filled += ((board.occupancy[r] ?? 0) >>> c) & 1;
    gap = Math.min(gap, BOARD_SIZE - filled);
  }
  return gap;
}

function search(
  board: Board,
  pieces: readonly Piece[],
  used: number,
  depth: number,
): boolean {
  const unused = ~used & ((1 << pieces.length) - 1);
  const remaining = popcount(unused);
  // Pieces that don't fit yet need a line cleared first, by the pieces that
  // do fit. Spotting when that's impossible keeps proving a tray unplaceable
  // cheap.
  const misfits = misfitsOf(board, pieces, unused);
  if (misfits === 0) {
    if (remaining <= 1) return true;
  } else if (cellsOf(pieces, unused & ~misfits) < smallestGap(board)) {
    return false;
  }
  // With one other piece left, it alone must clear a line.
  const mustClear = misfits !== 0 && remaining === 2;
  const candidates = unused & ~misfits;
  for (let i = 0; i < pieces.length; i++) {
    if (((candidates >>> i) & 1) === 0 || repeatsEarlier(pieces, unused, i))
      continue;
    if (tryPiece(board, pieces, i, used, depth, mustClear)) return true;
  }
  return false;
}

/** Tries every placement of piece `i`, then searches on from each. */
function tryPiece(
  board: Board,
  pieces: readonly Piece[],
  i: number,
  used: number,
  depth: number,
  mustClear: boolean,
): boolean {
  const piece = pieces[i];
  if (!piece) return false;
  scratch[depth] ??= {
    occupancy: new Uint16Array(BOARD_SIZE),
    colours: NO_COLOURS,
  };
  const next = scratch[depth];
  const cols = BOARD_SIZE - piece.width + 1;
  const positions = (BOARD_SIZE - piece.height + 1) * cols;
  for (let p = 0; p < positions; p++) {
    const row = Math.floor(p / cols);
    const col = p % cols;
    if (!canPlace(board, piece, row, col)) continue;
    if (--work < 0) return true;
    if (mustClear && previewLines(board, piece, row, col) === 0) continue;
    placeInto(next.occupancy, board, piece, row, col);
    if (search(next, pieces, used | (1 << i), depth + 1)) return true;
  }
  return false;
}

/** Bitmask of the pieces in `among` that don't fit anywhere on `board`. */
function misfitsOf(
  board: Board,
  pieces: readonly Piece[],
  among: number,
): number {
  let misfits = 0;
  for (let i = 0; i < pieces.length; i++) {
    const piece = pieces[i];
    if (piece && (among >>> i) & 1 && !canPlaceAnywhere(board, piece))
      misfits |= 1 << i;
  }
  return misfits;
}

/** Total squares of the pieces in `among`. */
function cellsOf(pieces: readonly Piece[], among: number): number {
  let cells = 0;
  for (let i = 0; i < pieces.length; i++) {
    if ((among >>> i) & 1) cells += pieces[i]?.cells.length ?? 0;
  }
  return cells;
}

/** Whether an earlier unused slot holds the same piece, so slot `i` was already explored. */
function repeatsEarlier(
  pieces: readonly Piece[],
  unused: number,
  i: number,
): boolean {
  for (let j = 0; j < i; j++) {
    if ((unused >>> j) & 1 && pieces[j] === pieces[i]) return true;
  }
  return false;
}

export interface Deal {
  readonly tray: Piece[];
  readonly rngState: number;
}

function drawTray(
  rngState: number,
  count: number,
  deck: readonly WeightedPiece[],
  weights: readonly number[],
): Deal {
  const total = weights.reduce((sum, w) => sum + w, 0);
  const tray: Piece[] = [];
  let state = rngState;
  for (let i = 0; i < count; i++) {
    const step = nextRandom(state);
    state = step.state;
    let target = step.value * total;
    let pick = deck.length - 1;
    for (let d = 0; d < deck.length; d++) {
      target -= weights[d] ?? 0;
      if (target < 0) {
        pick = d;
        break;
      }
    }
    const entry = deck[pick];
    if (!entry) throw new Error("Game rules have an empty deck");
    tray.push(entry.piece);
  }
  return { tray, rngState: state };
}

/**
 * Deals `count` pieces from `deck` for `board`. Deterministic for a given
 * `rngState`, so games stay replayable from their seed.
 */
export function dealTray(
  rngState: number,
  board: Board,
  count: number,
  deck: readonly WeightedPiece[],
  assist?: DealAssist,
): Deal {
  if (!assist || boardFill(board) > assist.maxFill) {
    return drawTray(
      rngState,
      count,
      deck,
      deck.map((entry) => entry.weight),
    );
  }
  const fits = deck.map(({ piece }) => canPlaceAnywhere(board, piece));
  const weights = deck.map(
    ({ weight }, i) => weight * (fits[i] ? 1 : assist.misfitWeight),
  );
  // One budget across all attempts; once spent, `search` accepts the tray.
  work = assist.searchBudget;
  let deal = drawTray(rngState, count, deck, weights);
  for (let attempt = 2; attempt <= assist.attempts; attempt++) {
    if (search(board, deal.tray, 0, 0)) return deal;
    // Last chance: only pieces that fit right now.
    const last = attempt === assist.attempts && fits.includes(true);
    deal = drawTray(
      deal.rngState,
      count,
      deck,
      last ? weights.map((w, i) => (fits[i] ? w : 0)) : weights,
    );
  }
  return deal;
}
