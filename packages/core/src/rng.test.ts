import { describe, expect, it } from "vitest";
import { nextRandom } from "./rng";

describe("nextRandom", () => {
  it("is deterministic and stays in [0, 1)", () => {
    let a = 123;
    let b = 123;
    for (let i = 0; i < 1000; i++) {
      const stepA = nextRandom(a);
      const stepB = nextRandom(b);
      expect(stepA).toEqual(stepB);
      expect(stepA.value).toBeGreaterThanOrEqual(0);
      expect(stepA.value).toBeLessThan(1);
      a = stepA.state;
      b = stepB.state;
    }
  });
});
