import type { CSSProperties } from "react";

/** Typed inline CSS custom properties (React's CSSProperties doesn't model them). */
export function cssVars(vars: Record<`--${string}`, string>): CSSProperties {
  return vars as CSSProperties;
}
