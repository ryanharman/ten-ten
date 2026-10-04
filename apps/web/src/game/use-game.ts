import type { GameState, MoveResult } from "@ten-ten/core";
import { newGame, placePiece } from "@ten-ten/core";
import { useCallback, useRef, useState } from "react";

function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] ?? Date.now();
}

/**
 * Owns the game state. `getState` reads the latest state synchronously, so
 * pointer handlers never act on a stale render.
 */
export function useGame() {
  const [state, setState] = useState(() => newGame(randomSeed()));
  const stateRef = useRef<GameState>(state);

  const commit = useCallback((next: GameState) => {
    stateRef.current = next;
    setState(next);
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

  const restart = useCallback(() => commit(newGame(randomSeed())), [commit]);

  return { state, getState, place, restart };
}
