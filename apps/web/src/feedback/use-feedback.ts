import type { Board, MoveEvent } from "@ten-ten/core";
import { countLines } from "@ten-ten/core";
import { foundation } from "@ten-ten/tokens";
import type { RefObject } from "react";
import { useCallback, useRef, useState } from "react";
import { prefersReducedMotion } from "../motion";
import { readStored, writeStored } from "../storage";
import type { BoardEffects } from "./board-effects";
import { createBoardEffects } from "./board-effects";
import { vibrate } from "./haptics";
import type { SoundPlayer } from "./sound";
import { createSoundPlayer } from "./sound";

const SOUND_KEY = "sound";

/** Animation, sound and haptics for moves; owns the persisted sound setting. */
export function useFeedback(boardRef: RefObject<HTMLElement | null>) {
  const [soundOn, setSoundOn] = useState(() => readStored(SOUND_KEY) !== "off");
  const soundOnRef = useRef(soundOn);
  const effectsRef = useRef<BoardEffects | null>(null);
  effectsRef.current ??= createBoardEffects({
    getBoard: () => boardRef.current,
  });
  const soundRef = useRef<SoundPlayer | null>(null);
  soundRef.current ??= createSoundPlayer(() => soundOnRef.current);
  const effects = effectsRef.current;
  const sound = soundRef.current;

  const onMove = useCallback(
    (before: Board, event: MoveEvent, isOver: boolean) => {
      if (!prefersReducedMotion())
        effects.play(before, event.piece, event.row, event.col, event.lines);
      const lines = countLines(event.lines);
      const kind = lines > 0 ? "clear" : "place";
      sound.play(kind, lines);
      vibrate(kind);
      if (isOver) {
        window.setTimeout(() => {
          sound.play("gameOver");
          vibrate("gameOver");
        }, foundation.duration.slow);
      }
    },
    [effects, sound],
  );

  const toggleSound = useCallback(() => {
    const next = !soundOnRef.current;
    soundOnRef.current = next;
    setSoundOn(next);
    writeStored(SOUND_KEY, next ? "on" : "off");
  }, []);

  return {
    onMove,
    soundOn,
    toggleSound,
    unlockAudio: sound.unlock,
    resetEffects: effects.reset,
  };
}
