import { describe, expect, it } from "vitest";
import { darkTheme, lightTheme } from "./themes";

/** WCAG 2.x relative luminance. */
function luminance(hex: string): number {
  const channel = (offset: number) => {
    const c = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (hi + 0.05) / (lo + 0.05);
}

describe.each([lightTheme, darkTheme])("$name theme", (theme) => {
  it("uses #rrggbb colours only (portable to React Native)", () => {
    for (const value of [
      ...Object.values(theme.colour),
      ...Object.values(theme.piece),
    ]) {
      expect(value).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it("meets WCAG AA text contrast (4.5:1)", () => {
    expect(contrast(theme.colour.text, theme.colour.bg)).toBeGreaterThanOrEqual(
      4.5,
    );
    expect(
      contrast(theme.colour.textMuted, theme.colour.bg),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast(theme.colour.text, theme.colour.surface),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("meets WCAG non-text contrast (3:1) for pieces on empty cells", () => {
    for (const colour of Object.values(theme.piece)) {
      expect(contrast(colour, theme.colour.cellEmpty)).toBeGreaterThanOrEqual(
        3,
      );
    }
  });
});
