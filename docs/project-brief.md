# Project Brief — "ten-ten" (working title)

> **Living document.** This is the source of truth for what we are building and why.
> It MUST be updated in the same commit as any change that affects scope, rules,
> architecture, tooling or an open question below. If code and this doc disagree,
> the doc is wrong and must be fixed (or the code is, and the decision gets logged).

Last updated: 2026-10-04

---

## 1. Concept

A puzzle game played on a **10×10 grid**. The player drags and drops blocks
(polyomino pieces, Tetris-like shapes) onto the grid. Completing a full
**horizontal row or vertical column** clears it and awards points. Rows and
columns can clear simultaneously. The game ends when no offered piece can be
placed.

- Blocks come in **varying sizes and shapes**, each with **differing colours**.
- **Scoring is TBD** — but the gameplay loop must be designed with a pluggable
  scoring step from day one (see §4).
- **Name is a working title.** "ten-ten" / "1010!" already exist; a rename is
  expected. Keep the name out of code identifiers where practical (use a single
  config constant / package scope) so renaming is cheap.

## 2. Platform & audience

- **Mobile-first.** Primary use is on phones; touch drag-and-drop is the core
  interaction. Mouse support on desktop is secondary.
- **POC is web-based.**
- **Later: React Native app** for App Store (and likely Play Store) publishing.
- **Multiple device sizes are a priority** — small phones through tablets,
  safe-area insets (notches, home indicators), and orientation handling.

## 3. Non-negotiable constraints

| Area | Requirement |
|---|---|
| Language | TypeScript (strict) |
| Package manager | pnpm (workspaces) |
| Repo shape | Monorepo, structured so a React Native app can be added without restructuring |
| Linter / formatter | Biome |
| Static analysis | Fallow (dead code, unused exports/deps, duplication, complexity) |
| Performance | Core concern — 60fps drag on mid-range phones, minimal allocations in hot paths, small bundle |
| Theming | Design system built on tokens/variables from the start; themes are swappable |
| Responsiveness | Works across phone and tablet sizes |
| Docs | Agent docs (`AGENTS.md`) + this brief kept current, committed in git |

## 4. Gameplay loop (draft)

```
start → deal pieces → [player drags piece → validate placement → place
      → detect full rows/cols → clear → score → (all pieces used? deal) 
      → any piece placeable? ] → loop / game over
```

Design requirements for the loop:

- **Pure, deterministic game core.** Game state transitions are pure functions
  of `(state, action) → state`, with a seedable RNG. Enables testing, replays,
  undo, and sharing the exact same logic between web and native.
- **Scoring as a strategy.** `score(event) → points` is a swappable module
  receiving a rich event (cells placed, rows/cols cleared, combo/streak count,
  piece size) so we can iterate on scoring without touching rules.
- **Board representation optimised for speed** — e.g. bitboard / typed array
  (100 cells fits in two 64-bit words or a `Uint8Array(100)`), precomputed
  row/column masks, and precomputed piece masks so "can this piece fit
  anywhere?" checks are cheap.

## 4a. Rules (confirmed)

- 10×10 board, starts empty.
- **3 pieces dealt** at a time; a new set is dealt only once all three are placed.
- **No rotation** — pieces are placed in the orientation dealt.
- Any fully filled row or column clears; multiple rows/columns can clear at once.
- **Game over** when none of the remaining dealt pieces fits anywhere.
- **Piece set:** classic ~19 shapes — lines of 1–5 (horizontal & vertical),
  2×2 and 3×3 squares, small and large L/corner shapes in all orientations.
  Distribution/weighting TBD (tuning item).

## 5. Theming & design system (intent)

- All visual values (colours, spacing, radii, typography, motion durations,
  piece palette) come from **design tokens**, never hard-coded.
- Tokens are defined once in a platform-agnostic package (plain TS/JSON) and
  consumed by web (CSS custom properties) and, later, native.
- Themes = token overrides (at minimum light + dark; more selectable themes later).
- Piece colours are part of the theme, not the game rules (rules reference a
  piece *colour slot*, the theme maps slot → colour).
- Accessibility to consider: colour-blind safe palettes, sufficient contrast,
  reduced-motion support.

## 6. Architecture

```
apps/
  web/            # POC: Vite + React (DOM). PWA (offline). Portrait-only.
  (mobile/)       # future React Native app; short-term option is a WebView shell around apps/web
packages/
  core/           # pure TS game engine: board, pieces, rules, scoring, RNG. Zero runtime deps.
  tokens/         # design tokens + theme definitions (platform-agnostic TS)
tooling / config at root: biome.json, fallow config, tsconfig base, pnpm-workspace.yaml
```

Key principles:

- **`packages/core` has no DOM, React, or platform imports.** All platform
  specifics live in `apps/*`. This is what makes a native rewrite of the UI
  layer cheap.
- **Web UI is rebuilt, not shared, for native.** Only `core` and `tokens` are
  shared. A WebView wrapper of `apps/web` is an acceptable quick win for an
  early App Store build.
- **Drag performance:** the dragged piece moves via direct style updates
  (`transform`) driven by pointer events + `requestAnimationFrame`, not React
  state, so React does not re-render every frame.

## 6a. POC scope

| Feature | In POC? |
|---|---|
| Classic rules (§4a) | Yes |
| Local high score (device storage) | Yes |
| Accounts / online leaderboards | No — later |
| Sound | Yes (nice to have) — Web Audio API |
| Haptics | Yes (nice to have) — Vibration API where supported (not iOS Safari; native app later) |
| Portrait only | Yes |
| Offline / installable (PWA) | Yes |
| User-selectable themes | No — themes are for us to restyle; user choice later |
| Hosting | Not yet decided; likely a subdomain of the owner's personal domain |

## 6b. Performance targets

Target: **any mobile phone**, so we design for low-end Android as the baseline.

- Smooth drag (aim 60fps) on low-end devices; no per-frame React renders.
- No allocations in drag/placement hot paths; precomputed piece & line masks.
- Small initial bundle (budget to be set once scaffolded and measured).

## 7. Quality workflow (every iteration)

Each iteration cycle ends with reviewing and actioning:

1. **TypeScript / LSP diagnostics** — `tsc --noEmit` across the workspace, zero errors.
2. **Biome** — lint + format, zero errors; warnings actioned or explicitly justified.
3. **Fallow** — unused files/exports/deps, duplication, complexity; findings
   actioned or explicitly justified.
4. Tests for `packages/core` pass.

Exact commands live in `AGENTS.md` once the workspace is scaffolded.

## 8. Open questions

| # | Question | Status |
|---|---|---|
| Q1 | Scoring model | TBD (intentionally deferred; loop supports pluggable scoring) |
| Q2 | Piece distribution / weighting | Open — tune via playtesting |
| Q3 | Test stack (proposed: Vitest for core, Playwright for web E2E) | Proposed |
| Q4 | Hosting (likely subdomain of owner's personal domain) | Deferred |
| Q5 | Concrete performance budgets (bundle size, frame time) | Set after scaffolding + first measurement |
| Q6 | Final name | Open |
| Q7 | User-selectable themes, colour-blind palettes | Deferred (post-POC) |

## 9. Decision log

| Date | Decision | Rationale |
|---|---|---|
| 2026-10-04 | TypeScript, pnpm, Biome, Fallow, monorepo | Set by project owner |
| 2026-10-04 | Web POC first, React Native later | Set by project owner |
| 2026-10-04 | Pure, platform-agnostic game core package | Share logic across web/native; testable; performant |
| 2026-10-04 | Web stack: Vite + React (DOM); native UI rebuilt later | Leaner, faster web POC; shared core keeps native rewrite small; WebView shell is a short-term option |
| 2026-10-04 | Classic rules: 3 pieces per deal, no rotation, game over when none fit; classic ~19-shape set | Confirmed by owner |
| 2026-10-04 | POC scope: local high score, sound + haptics (nice to have), portrait only, offline PWA | Confirmed by owner |
| 2026-10-04 | Performance baseline: any mobile phone (design for low-end Android) | Confirmed by owner |
| 2026-10-04 | Theming is internal-only for POC | Confirmed by owner |
| 2026-10-04 | Use latest pnpm, pinned via `packageManager` | Local pnpm 7.33 is outdated |
