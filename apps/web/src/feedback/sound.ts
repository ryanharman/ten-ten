/**
 * Tiny synthesized sound effects via the Web Audio API — no audio assets to
 * download.
 *
 * Creating an AudioContext is expensive (100–250 ms on a throttled mobile
 * CPU), so `prepare()` creates it ahead of time during idle; browsers only
 * require the cheap `resume()` to happen in a user gesture, via `unlock()`.
 */
export type SoundKind = "place" | "clear" | "gameOver";

export interface SoundPlayer {
  /** Creates the audio context off the interaction path (call when idle). */
  prepare(): void;
  /** Resumes audio; must be called from a user gesture before sounds play. */
  unlock(): void;
  play(kind: SoundKind, lines?: number): void;
}

/** Semitone offsets of a major pentatonic scale — always sounds pleasant. */
const PENTATONIC = [0, 2, 4, 7, 9, 12, 14, 16];
const BASE_HZ = 523.25; // C5

const noteHz = (semitones: number) => BASE_HZ * 2 ** (semitones / 12);

function tone(
  ctx: AudioContext,
  {
    hz,
    endHz = hz,
    at,
    duration,
    type = "sine",
    gain = 0.12,
  }: {
    hz: number;
    endHz?: number;
    at: number;
    duration: number;
    type?: OscillatorType;
    gain?: number;
  },
): void {
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(hz, at);
  osc.frequency.exponentialRampToValueAtTime(endHz, at + duration);
  amp.gain.setValueAtTime(gain, at);
  amp.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  osc.connect(amp).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + duration);
}

const SOUNDS: Record<
  SoundKind,
  (ctx: AudioContext, now: number, lines: number) => void
> = {
  place: (ctx, now) =>
    tone(ctx, {
      hz: 220,
      endHz: 140,
      at: now,
      duration: 0.07,
      type: "triangle",
      gain: 0.18,
    }),
  clear: (ctx, now, lines) => {
    const notes = Math.min(PENTATONIC.length, 2 + lines * 2);
    for (let i = 0; i < notes; i++) {
      tone(ctx, {
        hz: noteHz(PENTATONIC[i] ?? 0),
        at: now + i * 0.06,
        duration: 0.18,
      });
    }
  },
  gameOver: (ctx, now) => {
    for (const [i, semis] of [7, 4, 0, -5].entries()) {
      tone(ctx, {
        hz: noteHz(semis - 12),
        at: now + i * 0.16,
        duration: 0.3,
        type: "triangle",
      });
    }
  },
};

export function createSoundPlayer(isEnabled: () => boolean): SoundPlayer {
  let ctx: AudioContext | null = null;

  const ensureContext = (): AudioContext | null => {
    if (typeof AudioContext === "function") ctx ??= new AudioContext();
    return ctx;
  };

  return {
    prepare() {
      ensureContext();
    },
    unlock() {
      const context = ensureContext();
      if (context?.state === "suspended") void context.resume();
    },
    play(kind, lines = 0) {
      if (!ctx || !isEnabled() || ctx.state !== "running") return;
      SOUNDS[kind](ctx, ctx.currentTime, lines);
    },
  };
}
