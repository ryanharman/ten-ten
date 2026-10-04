import { cubicBezier, foundation } from "@ten-ten/tokens";
import type { ReturnAnimation } from "./drag-controller";

/**
 * Flies the ghost back onto its tray slot, shrinking to the tray's scale.
 * Resolves immediately when motion is reduced or the WAAPI is unavailable.
 */
export function createReturnAnimation(
  getSlotPiece: (trayIndex: number) => Element | null,
  reducedMotion: () => boolean,
): ReturnAnimation {
  return async (ghost, trayIndex) => {
    const target = getSlotPiece(trayIndex);
    if (!target || reducedMotion() || typeof ghost.animate !== "function")
      return;
    const from = ghost.getBoundingClientRect();
    const to = target.getBoundingClientRect();
    const scale = from.width > 0 ? to.width / from.width : 1;
    const animation = ghost.animate(
      [
        { transform: ghost.style.transform },
        {
          transform: `translate3d(${to.left}px, ${to.top}px, 0) scale(${scale})`,
        },
      ],
      {
        duration: foundation.duration.normal,
        easing: cubicBezier(foundation.easing.out),
        fill: "forwards",
      },
    );
    await animation.finished;
  };
}
