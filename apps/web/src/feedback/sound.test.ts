import { afterEach, describe, expect, it, vi } from "vitest";
import { createSoundPlayer } from "./sound";

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  state: AudioContextState = "suspended";
  currentTime = 0;
  destination = {};
  oscillators = 0;
  constructor() {
    FakeAudioContext.instances.push(this);
  }
  resume = vi.fn(async () => {
    this.state = "running";
  });
  createOscillator() {
    this.oscillators++;
    const param = {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    };
    return {
      type: "sine",
      frequency: param,
      connect: (n: unknown) => n,
      start: vi.fn(),
      stop: vi.fn(),
    };
  }
  createGain() {
    const param = {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    };
    return { gain: param, connect: (n: unknown) => n };
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  FakeAudioContext.instances = [];
});

describe("createSoundPlayer", () => {
  it("stays silent until unlocked by a gesture", () => {
    vi.stubGlobal("AudioContext", FakeAudioContext);
    const player = createSoundPlayer(() => true);
    player.play("place");
    expect(FakeAudioContext.instances).toHaveLength(0);
  });

  it("plays more notes for bigger clears, and respects the enabled setting", async () => {
    vi.stubGlobal("AudioContext", FakeAudioContext);
    let enabled = true;
    const player = createSoundPlayer(() => enabled);
    player.unlock();
    player.unlock();
    const ctx = FakeAudioContext.instances[0];
    if (!ctx) throw new Error("no context");
    await Promise.resolve();
    expect(FakeAudioContext.instances).toHaveLength(1);

    player.play("clear", 1);
    const oneLine = ctx.oscillators;
    player.play("clear", 3);
    expect(ctx.oscillators - oneLine).toBeGreaterThan(oneLine);
    player.play("place");
    player.play("gameOver");

    enabled = false;
    const before = ctx.oscillators;
    player.play("place");
    expect(ctx.oscillators).toBe(before);
  });

  it("does nothing where Web Audio is unavailable", () => {
    vi.stubGlobal("AudioContext", undefined);
    const player = createSoundPlayer(() => true);
    expect(() => {
      player.unlock();
      player.play("place");
    }).not.toThrow();
  });
});
