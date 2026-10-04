/**
 * Vibration feedback where supported (Android browsers). iOS Safari has no
 * Vibration API; native haptics arrive with the React Native app.
 */
export type HapticKind = "place" | "clear" | "gameOver";

const PATTERNS: Record<HapticKind, number | number[]> = {
  place: 8,
  clear: [14, 40, 22],
  gameOver: [30, 60, 30, 60, 60],
};

export function vibrate(kind: HapticKind): void {
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.vibrate === "function"
  ) {
    navigator.vibrate(PATTERNS[kind]);
  }
}
