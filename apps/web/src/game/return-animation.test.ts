import { describe, expect, it, vi } from "vitest";
import { createReturnAnimation } from "./return-animation";

function ghostWith(animate?: unknown): HTMLElement {
  const ghost = document.createElement("div");
  ghost.style.transform = "translate3d(10px, 20px, 0)";
  ghost.getBoundingClientRect = () =>
    ({ left: 10, top: 20, width: 100, height: 50 }) as DOMRect;
  Object.defineProperty(ghost, "animate", {
    value: animate,
    configurable: true,
  });
  return ghost;
}

const slotPiece = () => {
  const el = document.createElement("div");
  el.getBoundingClientRect = () =>
    ({ left: 200, top: 700, width: 50, height: 25 }) as DOMRect;
  return el;
};

describe("createReturnAnimation", () => {
  it("animates to the slot piece's position at tray scale", async () => {
    const animate = vi.fn(() => ({ finished: Promise.resolve() }));
    await createReturnAnimation(slotPiece, () => false)(ghostWith(animate), 0);
    expect(animate).toHaveBeenCalledWith(
      [
        { transform: "translate3d(10px, 20px, 0)" },
        { transform: "translate3d(200px, 700px, 0) scale(0.5)" },
      ],
      expect.objectContaining({ fill: "forwards" }),
    );
  });

  it("skips the animation when motion is reduced, the slot is missing or WAAPI is unavailable", async () => {
    const animate = vi.fn();
    await createReturnAnimation(slotPiece, () => true)(ghostWith(animate), 0);
    await createReturnAnimation(
      () => null,
      () => false,
    )(ghostWith(animate), 0);
    await createReturnAnimation(slotPiece, () => false)(
      ghostWith(undefined),
      0,
    );
    expect(animate).not.toHaveBeenCalled();
  });
});
