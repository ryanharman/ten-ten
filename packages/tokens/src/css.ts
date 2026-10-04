import type { ColourSlot } from "@ten-ten/core";
import { foundation } from "./foundation";
import type { Theme, ThemeColours } from "./themes";

type Variables = Record<string, string>;

const kebab = (key: string) =>
  key.replace(/[A-Z]/g, (ch) => `-${ch.toLowerCase()}`);

/** `var(--color-…)` reference for a semantic colour, for use in inline styles. */
export function colourVar(name: keyof ThemeColours): string {
  return `var(--color-${kebab(name)})`;
}

/** `var(--color-piece-N)` reference for a piece colour slot. */
export function pieceColourVar(slot: ColourSlot): string {
  return `var(--color-piece-${slot})`;
}

function groupVariables(
  prefix: string,
  group: Readonly<Record<string, string | number>>,
  unit = "",
): Variables {
  const vars: Variables = {};
  for (const [key, value] of Object.entries(group)) {
    vars[`--${prefix}-${kebab(key)}`] =
      typeof value === "number" ? `${value}${unit}` : value;
  }
  return vars;
}

function foundationVariables(): Variables {
  const easing: Variables = {};
  for (const [key, [x1, y1, x2, y2]] of Object.entries(foundation.easing)) {
    easing[`--ease-${kebab(key)}`] = `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`;
  }
  return {
    ...groupVariables("space", foundation.space, "px"),
    ...groupVariables("radius", foundation.radius, "px"),
    ...groupVariables("font", foundation.fontFamily),
    ...groupVariables("font-size", foundation.fontSize, "px"),
    ...groupVariables("font-weight", foundation.fontWeight),
    ...groupVariables("line-height", foundation.lineHeight),
    ...groupVariables("duration", foundation.duration, "ms"),
    ...easing,
    ...groupVariables("opacity", foundation.opacity),
    "--board-gap-ratio": String(foundation.boardGapRatio),
  };
}

function themeVariables(theme: Theme): Variables {
  return {
    "color-scheme": theme.colorScheme,
    ...groupVariables("color", theme.colour),
    ...groupVariables("color-piece", theme.piece),
  };
}

function block(selector: string, vars: Variables): string {
  const body = Object.entries(vars)
    .map(([name, value]) => `  ${name}: ${value};`)
    .join("\n");
  return `${selector} {\n${body}\n}`;
}

export interface ThemeCssOptions {
  /** Theme applied by default. */
  readonly light: Theme;
  /** Theme applied when the OS prefers dark mode (unless `data-theme` overrides). */
  readonly dark: Theme;
  /** Extra themes selectable via `<html data-theme="name">`. */
  readonly extra?: readonly Theme[];
}

/**
 * Serializes tokens to CSS custom properties. Theme selection:
 * `:root` = light, `prefers-color-scheme: dark` = dark, and
 * `[data-theme="<name>"]` forces any theme.
 */
export function buildThemeCss({
  light,
  dark,
  extra = [],
}: ThemeCssOptions): string {
  const themes = [light, dark, ...extra];
  return [
    block(":root", { ...foundationVariables(), ...themeVariables(light) }),
    `@media (prefers-color-scheme: dark) {\n${block(":root:not([data-theme])", themeVariables(dark))}\n}`,
    ...themes.map((theme) =>
      block(`:root[data-theme="${theme.name}"]`, themeVariables(theme)),
    ),
  ].join("\n\n");
}
