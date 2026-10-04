import type { ColourSlot } from "@ten-ten/core";

/** Hex colour (`#rrggbb`). Hex keeps themes portable to React Native. */
export type HexColour = `#${string}`;

/** A type alias (not an interface) so it is assignable to string-keyed records. */
export type ThemeColours = {
  /** App background. */
  readonly bg: HexColour;
  /** Raised surfaces: tray, dialogs. */
  readonly surface: HexColour;
  readonly text: HexColour;
  readonly textMuted: HexColour;
  readonly accent: HexColour;
  readonly boardBg: HexColour;
  readonly cellEmpty: HexColour;
  readonly danger: HexColour;
};

export interface Theme {
  readonly name: string;
  readonly colorScheme: "light" | "dark";
  readonly colour: ThemeColours;
  /** Colour for each piece colour slot defined by the game engine. */
  readonly piece: Readonly<Record<ColourSlot, HexColour>>;
}

export const lightTheme: Theme = {
  name: "light",
  colorScheme: "light",
  colour: {
    bg: "#F7F5F1",
    surface: "#FFFFFF",
    text: "#1F2328",
    textMuted: "#5B6170",
    accent: "#5B4FD6",
    boardBg: "#F7F5F1",
    cellEmpty: "#ECE8E1",
    danger: "#C42E2E",
  },
  piece: {
    1: "#6A5ACD",
    2: "#B07800",
    3: "#C4561A",
    4: "#D23F67",
    5: "#C42E2E",
    6: "#23893F",
    7: "#13897C",
    8: "#2F6FD6",
    9: "#1585B0",
  },
};

export const darkTheme: Theme = {
  name: "dark",
  colorScheme: "dark",
  colour: {
    bg: "#121419",
    surface: "#1C2028",
    text: "#ECEEF2",
    textMuted: "#9AA1AE",
    accent: "#8F82F0",
    boardBg: "#121419",
    cellEmpty: "#262B35",
    danger: "#EE5A50",
  },
  piece: {
    1: "#8F82F0",
    2: "#F5C142",
    3: "#F5934A",
    4: "#F06C8B",
    5: "#EE5A50",
    6: "#6CCB72",
    7: "#3DC0B0",
    8: "#5A93F0",
    9: "#4FCBEA",
  },
};
