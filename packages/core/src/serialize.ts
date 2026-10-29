import { createBoard } from "./board";
import { BOARD_SIZE } from "./constants";
import type { GameRules, GameState, TraySlot } from "./game";
import { DEFAULT_RULES, hasAnyMove } from "./game";
import type { Piece } from "./pieces";

const CELL_COUNT = BOARD_SIZE * BOARD_SIZE;
const MAX_COLOUR_SLOT = 9;

/**
 * Versioned, JSON-safe snapshot of a game. Occupancy is derived from colours
 * on load, so the two can never disagree. Bump `v` on breaking changes.
 */
export interface SavedGame {
  readonly v: 2;
  /** Colour slot per cell, row-major; 0 = empty. */
  readonly colours: readonly number[];
  /** Piece ids in the tray; `null` for used slots. */
  readonly tray: readonly (string | null)[];
  readonly score: number;
  readonly combo: number;
  readonly comboMovesLeft: number;
  readonly rngState: number;
}

/** Version 1 tracked a strict streak instead of a combo. */
interface SavedGameV1
  extends Omit<SavedGame, "v" | "combo" | "comboMovesLeft"> {
  readonly v: 1;
  readonly streak: number;
}

export function serializeGame(state: GameState): SavedGame {
  return {
    v: 2,
    colours: Array.from(state.board.colours),
    tray: state.tray.map((piece) => piece?.id ?? null),
    score: state.score,
    combo: state.combo,
    comboMovesLeft: state.comboMovesLeft,
    rngState: state.rngState,
  };
}

const isInt = (
  value: unknown,
  min: number,
  max = Number.MAX_SAFE_INTEGER,
): value is number =>
  Number.isInteger(value) &&
  (value as number) >= min &&
  (value as number) <= max;

function isSavedGame(data: unknown): data is SavedGame | SavedGameV1 {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  const progress =
    d.v === 2
      ? isInt(d.combo, 0) && isInt(d.comboMovesLeft, 0)
      : d.v === 1 && isInt(d.streak, 0);
  return (
    progress &&
    Array.isArray(d.colours) &&
    d.colours.length === CELL_COUNT &&
    d.colours.every((c) => isInt(c, 0, MAX_COLOUR_SLOT)) &&
    Array.isArray(d.tray) &&
    d.tray.every((id) => id === null || typeof id === "string") &&
    isInt(d.score, 0) &&
    isInt(d.rngState, -(2 ** 31), 2 ** 31 - 1)
  );
}

/**
 * Restores a game saved by `serializeGame`. Returns `null` for anything
 * invalid (corrupt, unknown version, unknown pieces) so callers can start
 * fresh. Version 1 saves still load.
 * `isOver` is recomputed rather than trusted.
 */
export function deserializeGame(
  data: unknown,
  rules: GameRules = DEFAULT_RULES,
): GameState | null {
  if (!isSavedGame(data) || data.tray.length !== rules.traySize) return null;
  const byId = new Map<string, Piece>(
    rules.deck.map(({ piece }) => [piece.id, piece]),
  );
  const tray: TraySlot[] = [];
  for (const id of data.tray) {
    const piece = id === null ? null : byId.get(id);
    if (piece === undefined) return null;
    tray.push(piece);
  }
  if (tray.every((slot) => slot === null)) return null;

  const board = createBoard();
  data.colours.forEach((colour, i) => {
    if (colour === 0) return;
    board.colours[i] = colour;
    const row = Math.floor(i / BOARD_SIZE);
    board.occupancy[row] =
      (board.occupancy[row] ?? 0) | (1 << (i % BOARD_SIZE));
  });

  return {
    board,
    tray,
    score: data.score,
    ...(data.v === 2
      ? { combo: data.combo, comboMovesLeft: data.comboMovesLeft }
      : // A v1 streak is a combo that's still live.
        {
          combo: data.streak,
          comboMovesLeft: data.streak > 0 ? rules.comboWindow : 0,
        }),
    rngState: data.rngState,
    isOver: !hasAnyMove(board, tray),
  };
}
