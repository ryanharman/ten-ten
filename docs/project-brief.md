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

## 4. Gameplay loop

```
start → deal pieces → [player drags piece → validate placement → place
      → detect full rows/cols → clear → score → (all pieces used? deal) 
      → any piece placeable? ] → loop / game over
```

Design requirements for the loop (implemented in `packages/core`):

- **Pure, deterministic game core.** `placePiece(state, trayIndex, row, col, rules)`
  returns `{ state, event }` (or `null` for an illegal move) and never mutates
  its input. Randomness comes from a seedable PRNG (mulberry32) whose state
  lives in `GameState.rngState`, so games are replayable from a seed.
- **Scoring as a strategy.** `GameRules.scoring` is a `ScoringRule`:
  `(ScoringEvent) → points`, where the event carries `cellsPlaced`,
  `rowsCleared`, `colsCleared` and `streak` (consecutive clearing moves).
  Current placeholder `classicScoring`: 1 pt/cell + 10 × n(n+1)/2 for n lines.
- **Rules as data.** `GameRules` = `{ deck (pieces + weights), traySize, scoring }`;
  `DEFAULT_RULES` is the classic game. Tuning doesn't touch engine code.
- **Move events drive presentation.** `MoveEvent` reports the piece, position,
  cleared lines, points and whether a new tray was dealt, for UI animation,
  sound and haptics.

### Engine internals (performance)

- **Board** = `occupancy: Uint16Array(10)` (one 10-bit mask per row) +
  `colours: Uint8Array(100)` (colour slot per cell, 0 = empty).
- **Pieces** are authored as ASCII art and compiled once into per-row bitmasks.
  A fit check is ≤5 bitwise ANDs; a full row is `0x3FF`; full columns are the
  AND of all rows.
- **Drag hot paths are allocation-free:** `canPlace` and `previewLines`
  (returns a packed `LineMask` number: bits 0–9 rows, 10–19 cols).
- Benchmarks (`pnpm bench`, Apple Silicon, includes Vitest getter overhead):
  `previewLines` ≈ 1 µs/call; `canPlaceAnywhere` for all 19 pieces ≈ 0.11 ms.

## 4a. Rules (confirmed)

- 10×10 board, starts empty.
- **3 pieces dealt** at a time; a new set is dealt only once all three are placed.
- **No rotation** — pieces are placed in the orientation dealt.
- Any fully filled row or column clears; multiple rows/columns can clear at once.
- **Game over** when none of the remaining dealt pieces fits anywhere.
- **Piece set:** classic ~19 shapes — lines of 1–5 (horizontal & vertical),
  2×2 and 3×3 squares, small and large L/corner shapes in all orientations.
  Distribution/weighting TBD (tuning item).

## 5. Theming & design system

Implemented in `packages/tokens` (platform-agnostic TS, no runtime deps).

- **Foundation tokens** (`foundation.ts`, theme-independent): spacing scale,
  radii, font families/sizes/weights, line heights, durations, easings,
  opacities, layout max width, z-index layers, board gap ratio. Values are **unitless numbers** (px / ms) so React
  Native can use them directly; the CSS serializer adds units. Easings are
  cubic-bézier tuples, valid for CSS and RN `Easing.bezier`.
- **Themes** (`themes.ts`): semantic colours (`bg`, `surface`, `text`,
  `textMuted`, `accent`, `boardBg`, `cellEmpty`, `danger`) plus
  a **piece palette keyed by the engine's `ColourSlot`** (1–9) — the engine says
  *which* slot, the theme says *what colour*. Colours are **`#RRGGBB` hex only**
  (RN does not support `oklch()` etc.).
- **Accessibility enforced by tests:** text ≥ 4.5:1 on bg/surface (WCAG AA),
  every piece ≥ 3:1 against empty cells (WCAG non-text contrast).
- **Web delivery:** a Vite plugin serves `virtual:tokens.css`, generated at build
  time by `buildThemeCss()` — zero runtime cost (~1 KB gzip).
  - `:root` = light theme + foundation tokens
  - `@media (prefers-color-scheme: dark)` → dark theme (follows the OS)
  - `<html data-theme="name">` forces a theme (for us now, user choice later)
- **Consuming tokens on web:** CSS uses `var(--…)`; TS/inline styles use
  `colourVar("cellEmpty")` / `pieceColourVar(slot)`. Never hard-code colours,
  sizes or durations.
- **Adding a theme:** create a `Theme` object in `themes.ts`, pass it as
  `extra` to `buildThemeCss` in `apps/web/vite.config.ts`; contrast tests apply
  automatically once it's added to the `describe.each` list.
- Later: user-selectable themes, colour-blind-safe palette (Q7).

## 6. Architecture

```
apps/
  web/            # POC: Vite + React (DOM). PWA (offline). Portrait-only.
  (mobile/)       # future React Native app; short-term option is a WebView shell around apps/web
packages/
  core/           # pure TS game engine: board, pieces, rules, scoring, RNG. Zero runtime deps.
  tokens/         # design tokens + themes (platform-agnostic TS); may type-import core
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
  state, so React does not re-render during a drag. The drop preview toggles
  `data-preview` / `data-clear` attributes on board cells directly
  (`game/board-preview.ts`), only when the snapped cell changes. React renders
  once at drag start (ghost), once at drop (new state).
- **Drag logic is framework-agnostic** (`game/drag-controller.ts`), with a thin
  React binding (`use-drag.ts`). It should port to a RN gesture handler with the
  same snapping maths (`game/geometry.ts`).
- **Layout is pure CSS:** the app column is an inline-size container (max
  `--layout-max-width`); the board area is a size container and the board is
  `min(100cqw, 100cqh)` square; tray slots are sized from container width.
  Safe-area insets via `env(safe-area-inset-*)`, `100dvh` height.
- **Drag robustness:** after a drag starts, pointer events are read from
  `window` (not the tray slot), so release is always seen. Starting a new drag
  cancels any previous one, and Restart cancels any drag — a lost pointer-up
  can't leave a piece stuck on screen. (Added after a one-off report of a
  stuck piece after a line clear; not reproduced in 800 automated moves.)
- **Feedback (`src/feedback/`):** placement pop and a line-clear wave
  (flash → shrink, rippling outward from the drop point, staggered by
  `--duration-stagger`) via attributes + CSS animations on board cells, the
  cleared block drawn by `::after` so the empty cell shows beneath; invalid
  drops fly back to the tray (Web Animations API). All motion is skipped under
  `prefers-reduced-motion`. Sounds are synthesized with Web Audio (no assets):
  click on place, pentatonic run on clear (longer for more lines), falling
  phrase on game over; mute toggle persisted. Haptics via the Vibration API
  (Android only; iOS Safari has none — native haptics come with RN).
- **Persistence:** `src/storage.ts` wraps localStorage (namespaced `ten-ten:`,
  failure-tolerant). Stores best score and sound setting.
- **PWA (`vite-plugin-pwa`, Workbox `generateSW`):** installable
  (`display: standalone`, `orientation: portrait`), whole app precached for
  offline play. Manifest colours come from tokens; `theme-color` metas for
  light/dark are injected by the tokens Vite plugin. Updates use
  `registerType: "prompt"` with no prompt UI: a waiting version is applied when
  the player starts a new game (`src/app-update.ts`), never mid-game. Service
  workers only run on HTTPS (or localhost) — relevant when hosting.
- **Portrait:** enforced by the manifest when installed; in a browser tab,
  phones in landscape (`max-height: 500px`) see a rotate prompt. Tablets in
  landscape still play.
- **Name & icons are placeholders.** The display name is `APP_NAME` in
  `apps/web/vite.config.ts` (+ `<title>`/apple title in `index.html`). Icons
  are generated from `apps/web/public/icon.svg` with `pnpm --filter
  @ten-ten/web icons`; generated PNGs are committed.
- **Touch feel:** on touch, the dragged piece floats 1.5 cells above the finger
  (`TOUCH_LIFT_CELLS`); with a mouse it centres on the cursor. Tray pieces that
  can't fit anywhere are dimmed.

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

## 6b. Performance targets & budgets

Target: **any mobile phone**, so we design for low-end Android as the baseline.

**Budgets (enforced):**

| Budget | Limit | Current (2026-10-04) | Enforced by |
|---|---|---|---|
| Shipped JS (gzip, all chunks) | 85 KB | 75.5 KB | `pnpm size` (part of `pnpm check`) |
| Shipped CSS (gzip) | 4 KB | 2.3 KB | `pnpm size` |
| Drag p95 frame time @ 6× CPU slowdown | ≤ 20 ms | 16.8 ms | `pnpm perf` |
| Longest main-thread task during play @ 6× | ≤ 50 ms | 0 (none) | `pnpm perf` |
| Drop → next painted frame @ 6× | ≤ 50 ms | ~39 ms (≈ 2 frames) | `pnpm perf` |

`pnpm perf` serves the production build, emulates a 390×844 @3x touch phone
with Chromium CPU throttling (6× ≈ budget Android; 4× = Lighthouse mobile),
drags a piece across the board for ~3 s, drops it, and reports frame
percentiles, long tasks and drop latency. It is not in `pnpm check` (needs a
browser, ~10 s); run it for any change to drag, rendering, effects or startup.

**Findings so far:**

- Dragging holds a steady 60 fps (p50 & p95 16.7 ms) even at 6× slowdown.
- Creating the Web Audio `AudioContext` on first touch caused a **120–250 ms
  long task** that froze the start of the first drag. Fixed by creating it
  during idle after load and only `resume()`-ing it in the gesture.
- React + ReactDOM are ~60 of the 75 KB JS. If the budget tightens, Preact
  (`preact/compat`) is the obvious lever.

Principles: no per-frame React renders; no allocations in drag hot paths;
precomputed piece & line masks; measure before and after optimising.

## 7. Quality workflow (every iteration)

Each iteration cycle ends with reviewing and actioning:

1. **TypeScript / LSP diagnostics** — `tsc --noEmit` across the workspace, zero errors.
2. **Biome** — lint + format, zero errors; warnings actioned or explicitly justified.
3. **Fallow** — unused files/exports/deps, duplication, complexity; findings
   actioned or explicitly justified.
4. Tests for `packages/core` pass.

Single command: `pnpm check`. Details and commands live in `AGENTS.md`.

Tooling as configured:

- **TypeScript 7** (native compiler), strict + `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, `verbatimModuleSyntax`.
- **Biome 2** — recommended preset + React and test domains; `noExplicitAny`
  and `noNonNullAssertion` are errors. 2-space indent, double quotes.
- **Fallow 3** — all warn-by-default cleanup rules promoted to error (strict);
  `private-type-leaks` enabled as warn; suppressions must state a reason;
  architecture **boundaries** enforce `core → nothing`, `web → core`.
- **Vitest 5** for unit tests — one root run (`vitest.config.ts`, projects per
  package; web uses happy-dom + Testing Library) producing V8 coverage, which
  is fed to Fallow so its CRAP (complexity × untested) scores are exact.
  `pnpm check` order: typecheck → Biome → tests+coverage → Fallow.
- **Fallow overrides:** `private-type-leaks` is off for `apps/**` (component
  props types are app-internal); still on for `packages/**`.
- **Manual browser verification:** for UI changes, drive the dev server with
  headless Playwright at phone sizes (390×844, 320×568) and tablet (768×1024),
  mouse + touch (CDP touch events) drags, light + dark themes, and check the
  console for errors. Playwright is not a project dependency yet (see Q3).

## 8. Roadmap

| Step | Scope | Status |
|---|---|---|
| 1 | Tooling & workspace: pnpm workspace, TS base config, Biome, Fallow, Vitest, `pnpm check` | Done |
| 2 | `packages/core`: board (bitboard/typed array), piece set, seeded RNG, deal/fit/place/clear/game-over, pluggable scoring, tests | Done |
| 3 | `packages/tokens`: design tokens + light/dark themes, emitted as CSS custom properties | Done |
| 4 | `apps/web`: responsive board with safe areas, pointer-driven drag (no per-frame React renders), ghost preview, clear animations, score + local high score, sound, haptics, PWA, portrait lock | Done |
| 4a | Responsive board + tray, pointer drag with lift, drop preview incl. line-clear highlight, scoring display, game over + restart | Done |
| 4b | Feedback: placement/clear animations, invalid-drop return animation, sound, haptics, local high score; drag robustness | Done |
| 4c | PWA (offline, installable), portrait lock, theme-color meta, icons | Done |
| 5 | Measure: bundle + drag perf on low-end device; set concrete budgets | Done |

## 9. Open questions

| # | Question | Status |
|---|---|---|
| Q1 | Scoring model — placeholder `classicScoring` in place; streak available for combo bonuses | TBD |
| Q2 | Piece distribution / weighting — currently uniform (weight 1 each) | Open — tune via playtesting |
| Q3 | Web E2E test suite — Playwright now a dev dep (used by `pnpm perf`); no E2E tests yet | Open |
| Q4 | Hosting | Resolved — Cloudflare Workers static assets at `tenten.ryanharman.dev` (§10) |
| Q5 | Concrete performance budgets | Resolved — see §6b |
| Q6 | Final name (placeholder "ten-ten" + block icon in use) | Open |
| Q7 | User-selectable themes, colour-blind palettes | Deferred (post-POC) |

## 10. Delivery

- **CI:** GitHub Actions (`.github/workflows/ci.yml`) runs `pnpm check` on
  pushes to `main` and on pull requests.
- **Hosting:** Cloudflare Workers static assets (`wrangler.jsonc`, no Worker
  code), deployed by Cloudflare Workers Builds on push to `main`
  (build `pnpm build`, deploy `npx wrangler deploy`, env `NODE_VERSION=22`,
  `PNPM_VERSION=12.9.1`). Custom domain `tenten.ryanharman.dev` (DNS on
  Cloudflare). SPA fallback via `not_found_handling`.
- **Caching:** `apps/web/public/_headers` — entry points (`/`, `index.html`,
  `sw.js`, `registerSW.js`, manifest) are `no-cache` so updates reach players;
  hashed `/assets/*` are immutable for a year. Plus basic security headers.
- **Showcase:** a projects entry on the owner's site (ryanharman.dev).

## 11. Decision log

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
| 2026-10-04 | Use latest pnpm, pinned via `packageManager` (12.9.1) | Local pnpm 7.33 is outdated |
| 2026-10-04 | TypeScript 7, Biome 2, Fallow 3 (strict), Vitest 5, Vite 8, React 19 | Latest stable versions at scaffold time |
| 2026-10-04 | Workspace packages consumed as TS source (no package build step) | Simpler, faster; Vite & Vitest compile TS directly |
| 2026-10-04 | Fallow strict mode + architecture boundaries | Owner wants warnings actioned every iteration; enforce pure core |
| 2026-10-04 | Board as row bitmasks (`Uint16Array`) + colour array (`Uint8Array`) | Constant-time-ish fit checks, cheap copies, allocation-free drag previews |
| 2026-10-04 | Engine API: pure `placePiece` returning `{ state, event }`; rules (deck, tray size, scoring) passed as data | Determinism, replayability, tunable without code changes |
| 2026-10-04 | Placeholder scoring: 1/cell + triangular line bonus; tray of 3; uniform piece weights | Classic feel until scoring is designed |
| 2026-10-04 | Benchmarks via Vitest 5 `bench` in `*.bench.ts` (not part of `pnpm check`) | Track hot-path performance without slowing the check loop |
| 2026-10-04 | Tokens: unitless numeric values, hex colours, cubic-bézier tuples | Portable to React Native without conversion |
| 2026-10-04 | Theme piece palette keyed by engine `ColourSlot`; tokens may only type-import core | Engine owns slots, theme owns colours; enforced by Fallow boundaries |
| 2026-10-04 | Theme CSS generated at build time via Vite virtual module; light default, dark via OS preference, `data-theme` override | Zero runtime cost; follows system dark mode |
| 2026-10-04 | WCAG contrast thresholds enforced in token tests | Accessibility regressions fail CI |
| 2026-10-04 | Vite & Vitest in `apps/web` run with `--configLoader runner` (experimental) | Lets `vite.config.ts` import workspace TS source (extensionless imports). Fallback if it breaks: explicit `.ts` import extensions in packages |
| 2026-10-04 | Web drag: framework-agnostic controller + imperative DOM preview; React renders only at drag start/drop | Smooth drag on low-end phones; portable logic |
| 2026-10-04 | Pure-CSS responsive layout via container queries | No JS layout/resize handling |
| 2026-10-04 | Single root Vitest run with coverage fed to Fallow; check order typecheck → lint → test → fallow | Accurate CRAP scores; untested complex code fails the check |
| 2026-10-04 | Removed `cellClearHint` token; clearing lines preview in the dragged piece's colour | Clearer feedback, one fewer token |
| 2026-10-04 | Drag listens on `window`; new drag / Restart cancel any active drag | Self-healing against lost pointer-up (user-reported stuck piece) |
| 2026-10-04 | Effects via data attributes + CSS keyframes; return-to-tray via WAAPI; reduced-motion respected | No React renders for effects; GPU-friendly transforms |
| 2026-10-04 | Synthesized Web Audio sounds; Vibration API haptics | Zero asset weight; works offline |
| 2026-10-04 | localStorage for best score + sound setting (namespaced, try/catch) | Local-only persistence per POC scope |
| 2026-10-04 | PWA via vite-plugin-pwa 1.3 (2.0 blocked by pnpm minimum release age); updates applied on new game | Offline + installable; never interrupt a game |
| 2026-10-04 | Portrait: manifest orientation + rotate prompt for landscape phones only | Browsers can't lock orientation in a tab; tablets fit in landscape |
| 2026-10-04 | Placeholder name "ten-ten" and block-art icon | Rename deferred (Q6) |
| 2026-10-04 | Budgets: JS ≤ 85 KB gz, CSS ≤ 4 KB gz (gated in `pnpm check`); drag p95 ≤ 20 ms, long task ≤ 50 ms, drop→paint ≤ 50 ms @ 6× CPU (`pnpm perf`) | Measured baseline + headroom; low-end Android target |
| 2026-10-04 | Create AudioContext during idle; resume on gesture | Removed a 120–250 ms first-touch stall |
| 2026-10-04 | Playwright added as web dev dependency (perf harness) | Real-browser measurement; foundation for future E2E |
| 2026-10-04 | Kebab-case file names, enforced by Biome; history rewritten to apply it | Owner's convention |
| 2026-10-04 | CI on GitHub Actions running `pnpm check` | Checks can't be skipped |
| 2026-10-04 | Host on Cloudflare Workers static assets at tenten.ryanharman.dev, deployed via Workers Builds | DNS already on Cloudflare; HTTPS for PWA; control over cache headers |
