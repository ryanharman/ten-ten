import type { GameState, MoveResult } from "@ten-ten/core";
import { newGame, placePiece } from "@ten-ten/core";
import { useCallback, useRef, useState } from "react";
import { readStored, writeStored } from "../storage";

const BEST_KEY = "best";

function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] ?? Date.now();
}

function readBest(): number {
  const value = Number(readStored(BEST_KEY));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * Owns the game state and the persisted high score. `getState` reads the
 * latest state synchronously, so pointer handlers never act on a stale render.
 */
export function useGame() {
  const [state, setState] = useState(() => newGame(randomSeed()));
  const stateRef = useRef<GameState>(state);
  const [best, setBest] = useState(readBest);
  /** High score when this game started — to tell whether this game beat it. */
  const [bestAtStart, setBestAtStart] = useState(best);
  const bestRef = useRef(best);

  const commit = useCallback((next: GameState) => {
    stateRef.current = next;
    setState(next);
    if (next.score > bestRef.current) {
      bestRef.current = next.score;
      setBest(next.score);
      writeStored(BEST_KEY, String(next.score));
    }
  }, []);

  const getState = useCallback(() => stateRef.current, []);

  const place = useCallback(
    (trayIndex: number, row: number, col: number): MoveResult | null => {
      const result = placePiece(stateRef.current, trayIndex, row, col);
      if (result) commit(result.state);
      return result;
    },
    [commit],
  );

  const restart = useCallback(() => {
    setBestAtStart(bestRef.current);
    commit(newGame(randomSeed()));
  }, [commit]);

  return {
    state,
    best,
    isNewBest: state.score > bestAtStart,
    getState,
    place,
    restart,
  };
}
