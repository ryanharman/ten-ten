import type { GameState, MoveResult } from "@ten-ten/core";
import { newGame, placePiece } from "@ten-ten/core";
import { useCallback, useEffect, useRef, useState } from "react";
import type { DeferredWriter } from "../runs/deferred-writer";
import { createDeferredWriter } from "../runs/deferred-writer";
import type { CurrentRun, RunOutcome, RunRecord } from "../runs/run-recorder";
import { recordMove, startRun, summariseRun } from "../runs/run-recorder";
import type { Session } from "../runs/run-store";
import {
  appendRun,
  loadHistory,
  loadSession,
  saveSession,
} from "../runs/run-store";
import { readStored, writeStored } from "../storage";

const BEST_KEY = "best";

function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] ?? Date.now();
}

function freshSession(best: number): Session {
  return { state: newGame(randomSeed()), run: startRun(Date.now(), best) };
}

function archive(
  history: readonly RunRecord[],
  run: CurrentRun,
  outcome: RunOutcome,
): RunRecord[] {
  return appendRun(history, summariseRun(run, outcome, Date.now()));
}

interface Initial {
  readonly session: Session;
  readonly history: RunRecord[];
  readonly best: number;
}

/** Restores the saved session and history; repairs a finished-but-unarchived run. */
function loadInitial(): Initial {
  let history = loadHistory();
  const storedBest = Number(readStored(BEST_KEY));
  const best = Math.max(
    Number.isFinite(storedBest) ? storedBest : 0,
    ...history.map((r) => r.score),
  );
  let session = loadSession() ?? freshSession(best);
  if (session.state.isOver && !session.run.archived) {
    history = archive(history, session.run, "completed");
    session = { ...session, run: { ...session.run, archived: true } };
  }
  return { session, history, best: Math.max(best, session.state.score) };
}

/**
 * Owns the game state, its persistence (the game in progress survives
 * reloads) and the run history. `getState` reads the latest state
 * synchronously, so pointer handlers never act on a stale render.
 */
export function useGame() {
  const [initial] = useState(loadInitial);
  const [session, setSession] = useState(initial.session);
  const [history, setHistory] = useState(initial.history);
  const [best, setBest] = useState(initial.best);
  const sessionRef = useRef(initial.session);
  const historyRef = useRef(initial.history);
  const bestRef = useRef(initial.best);
  const saverRef = useRef<DeferredWriter<Session> | null>(null);
  saverRef.current ??= createDeferredWriter(saveSession);
  const saver = saverRef.current;
  useEffect(() => () => saver.flush(), [saver]);

  const commit = useCallback(
    (next: Session) => {
      sessionRef.current = next;
      setSession(next);
      saver.schedule(next);
      if (next.state.score > bestRef.current) {
        bestRef.current = next.state.score;
        setBest(next.state.score);
        writeStored(BEST_KEY, String(next.state.score));
      }
    },
    [saver],
  );

  const pushHistory = useCallback((run: CurrentRun, outcome: RunOutcome) => {
    historyRef.current = archive(historyRef.current, run, outcome);
    setHistory(historyRef.current);
  }, []);

  const getState = useCallback((): GameState => sessionRef.current.state, []);

  const place = useCallback(
    (trayIndex: number, row: number, col: number): MoveResult | null => {
      const result = placePiece(sessionRef.current.state, trayIndex, row, col);
      if (!result) return null;
      let run = recordMove(sessionRef.current.run, result.event, Date.now());
      if (result.state.isOver) {
        pushHistory(run, "completed");
        run = { ...run, archived: true };
      }
      commit({ state: result.state, run });
      return result;
    },
    [commit, pushHistory],
  );

  const restart = useCallback(() => {
    const { run } = sessionRef.current;
    if (!run.archived && run.samples.length > 0) pushHistory(run, "abandoned");
    commit(freshSession(bestRef.current));
  }, [commit, pushHistory]);

  const { state, run } = session;
  return {
    state,
    best,
    isNewBest: state.score > run.bestAtStart,
    history,
    getState,
    place,
    restart,
  };
}
