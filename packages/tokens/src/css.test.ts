import { describe, expect, it } from "vitest";
import { buildThemeCss, colourVar, pieceColourVar } from "./css";
import { darkTheme, lightTheme } from "./themes";

describe("buildThemeCss", () => {
  const css = buildThemeCss({ light: lightTheme, dark: darkTheme });

  it("emits foundation and light theme variables on :root", () => {
    expect(css).toContain("--space-4: 16px;");
    expect(css).toContain("--duration-fast: 150ms;");
    expect(css).toContain("--ease-standard: cubic-bezier(0.2, 0, 0, 1);");
    expect(css).toContain(`--color-bg: ${lightTheme.colour.bg};`);
    expect(css).toContain(`--color-piece-1: ${lightTheme.piece[1]};`);
  });

  it("switches to dark via media query and allows explicit overrides", () => {
    expect(css).toContain("@media (prefers-color-scheme: dark)");
    expect(css).toContain(':root[data-theme="dark"]');
    expect(css).toContain(':root[data-theme="light"]');
  });

  it("references variables that exist in the generated CSS", () => {
    for (const ref of [
      colourVar("cellEmpty"),
      colourVar("textMuted"),
      pieceColourVar(9),
    ]) {
      const name = ref.slice("var(".length, -1);
      expect(css).toContain(`${name}:`);
    }
  });
});
