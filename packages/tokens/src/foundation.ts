/**
 * Theme-independent design tokens. Values are unitless numbers (px for sizes,
 * ms for durations) so they map directly onto React Native as well as CSS;
 * the CSS serializer adds units.
 */

/** Cubic-bézier control points, compatible with CSS and React Native `Easing.bezier`. */
export type CubicBezier = readonly [number, number, number, number];

export const foundation = {
  space: { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48, 8: 64 },
  radius: { sm: 4, md: 8, lg: 16, cell: 4, pill: 999 },
  fontFamily: {
    body: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    numeric: 'ui-rounded, "SF Pro Rounded", system-ui, sans-serif',
  },
  fontSize: { xs: 12, sm: 14, md: 16, lg: 20, xl: 28, xxl: 40 },
  fontWeight: { regular: 400, medium: 500, bold: 700 },
  lineHeight: { tight: 1.1, normal: 1.4 },
  duration: { instant: 80, fast: 150, normal: 250, slow: 400 },
  easing: {
    standard: [0.2, 0, 0, 1],
    out: [0, 0, 0.2, 1],
    in: [0.4, 0, 1, 1],
  } satisfies Record<string, CubicBezier>,
  layout: { maxWidth: 560 },
  zIndex: { overlay: 10, drag: 20 },
  /** Gap between board cells as a fraction of cell pitch. */
  boardGapRatio: 0.08,
  opacity: { preview: 0.45, disabled: 0.4 },
} as const;
