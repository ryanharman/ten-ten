# AGENTS.md

Guidance for AI agents (and humans) working in this repo.

## Read first

- **`docs/project-brief.md`** — the source of truth for scope, constraints,
  architecture, open questions and the decision log. Read it before starting work.

## Keeping docs current (mandatory)

- Any change to scope, game rules, architecture, tooling, or that resolves an
  open question **must update `docs/project-brief.md` in the same change**
  (including the decision log and "Last updated" date).
- If you change commands, scripts, or workflow, update this file too.
- Never leave docs describing behaviour the code no longer has.

## Project status

POC roadmap (steps 1–5) complete: installable, offline web game with animations,
sound, haptics, high score, and enforced performance budgets. Next work is
driven by the open questions in `docs/project-brief.md` §9 (scoring, piece
weights, hosting, name, E2E tests).
See `docs/project-brief.md` §8 for the roadmap.

## Repo layout

```
apps/web/          Vite + React web client (@ten-ten/web)
packages/core/     Pure TS game engine (@ten-ten/core) — no DOM/React/platform code
packages/tokens/   Design tokens + themes (@ten-ten/tokens) — platform-agnostic; type-only imports from core
biome.json         Lint + format config
wrangler.jsonc     Cloudflare Workers static-assets config (serves apps/web/dist)
.github/workflows/ CI: runs `pnpm check` on push to main and PRs
.fallowrc.json     Fallow static analysis config (strict rules + architecture boundaries)
tsconfig.base.json Shared strict TS config; each package extends it
```

Workspace packages are consumed **as TypeScript source** (`exports` → `./src/index.ts`);
there is no build step for packages.

## Commands

Run from the repo root. pnpm is pinned via `packageManager` (pnpm 12). If your
global `pnpm` is older, use `npx pnpm@12.9.1 <cmd>`.

| Command | What it does |
|---|---|
| `pnpm install` | Install all workspace deps |
| `pnpm dev` | Run the web app (Vite dev server) |
| `pnpm typecheck` | `tsc --noEmit` in every package (TypeScript 7) |
| `pnpm lint` / `pnpm lint:fix` | Biome check / auto-fix |
| `pnpm fallow` | Fallow with coverage (run `pnpm test` first): dead code, duplication, complexity/CRAP, boundaries |
| `pnpm test` | All tests in one Vitest run (root `vitest.config.ts`) with V8 coverage → `coverage/` |
| `pnpm bench` | Core hot-path benchmarks (`*.bench.ts`); run when touching `packages/core` hot paths |
| `pnpm build` | Production build of the web app (PWA included) |
| `pnpm size` | Bundle budget gate (gzip JS/CSS in `apps/web/dist`) — run after build |
| `pnpm perf` | Drag performance harness (production build, throttled CPU, touch) — needs Chromium: `pnpm --filter @ten-ten/web exec playwright install chromium` |
| `pnpm check` | typecheck → lint → test → fallow → build → size — must pass before committing |

Adding deps: `pnpm --filter @ten-ten/<pkg> add <dep>` (add `-D` for dev deps).
pnpm enforces a minimum release age, so brand-new versions may resolve to the
previous release — check peer ranges match (`pnpm peers check`).
Never add runtime dependencies to `packages/core` without logging a decision in the brief.

## Game engine (`packages/core`) quick reference

- Entry: `newGame(seed, rules?)` → `GameState`; `placePiece(state, trayIndex, row, col, rules?)` → `{ state, event } | null`.
- Drag hot paths (must stay allocation-free): `canPlace`, `previewLines`.
- Lines are a packed `LineMask` number — decode with `rowsOf` / `colsOf` / `countLines`.
- Scoring is pluggable via `GameRules.scoring`; piece odds via `GameRules.deck`.
- Tests sit next to source (`*.test.ts`); board fixtures use ASCII art via `src/test-utils.ts`.
- Details & rationale: `docs/project-brief.md` §4.

## Web app (`apps/web`) quick reference

- `src/game/`: `use-game.ts` (state), `drag-controller.ts` (pointer drag, framework-agnostic),
  `use-drag.ts` (React binding), `board-preview.ts` (imperative preview), `geometry.ts` (snapping maths).
- `src/feedback/`: `board-effects.ts` (place/clear animations via cell attributes), `sound.ts`
  (Web Audio synth), `haptics.ts`, `use-feedback.ts` (orchestrates per move; sound setting).
- `src/storage.ts`: the only place that touches localStorage.
- Deploys: pushing to `main` deploys to https://tenten.ryanharman.dev via Cloudflare
  Workers Builds. Cache/security headers live in `public/_headers` — keep entry
  points (`sw.js`, `index.html`, manifest) `no-cache` or updates get stuck.
- PWA: configured in `vite.config.ts` (`VitePWA`); the service worker is only
  built for production — test offline with `pnpm build` + `pnpm --filter @ten-ten/web preview`.
  Updates are applied on new game via `src/app-update.ts`; don't add auto-reload.
- Icons: edit `public/icon.svg`, then `pnpm --filter @ten-ten/web icons` and commit the PNGs.
- App name placeholder: `APP_NAME` in `vite.config.ts` plus `index.html` title tags.
- `src/components/`: `board-view.tsx` (memoised; children = 100 cells in row-major
  order — the preview relies on this), `tray.tsx`, `piece-view.tsx` (sized by `--pitch`),
  `game-over.tsx`, `sound-toggle.tsx`, `rotate-prompt.tsx`.
- Styles are CSS Modules using token variables only.
- Never set React state from pointermove; keep per-frame work in the controller's rAF callback.
- Imperative cell attributes (`data-preview`, `data-clear`, `data-placed`, `data-clearing`)
  are owned by `board-preview.ts` / `board-effects.ts`; React must not manage them. Reset them on restart.
- Any new animation must respect `prefers-reduced-motion` and use duration/easing tokens.
- Tests run in happy-dom; component tests use Testing Library.
- UI changes: verify in a real browser at phone sizes (see brief §7, "Manual browser verification").

## Hard rules

- **File names are kebab-case** (`board-view.tsx`, `use-drag.ts`,
  `app.module.css`); exported identifiers keep normal casing (`BoardView`,
  `useDrag`). Only tool-mandated names are exempt (`AGENTS.md`, `CLAUDE.md`,
  `README.md`). Enforced by Biome `useFilenamingConvention`.
- **Commits carry the author's attribution only** — no AI co-author trailers or
  "generated with" lines in commits or PRs.

- TypeScript strict mode. No `any` without a justifying comment.
- pnpm only (no npm/yarn lockfiles).
- Biome is the only linter/formatter.
- `packages/core` must stay pure: no DOM, React, React Native or platform imports.
  Enforced by: `lib` without DOM in its tsconfig, and Fallow boundary zones
  (`core` → nothing; `tokens` → `core` type-only; `web` → `core`, `tokens`).
- No hard-coded visual values — use design tokens. CSS: `var(--color-…)`,
  `var(--space-N)`, etc. TS: `colourVar()` / `pieceColourVar()` from `@ten-ten/tokens`.
  Theme colours must be `#RRGGBB` (RN-compatible). See brief §5.
- The web app's theme CSS comes from the `virtual:tokens.css` Vite plugin in
  `apps/web/vite.config.ts`; Vite and Vitest scripts in `apps/web` use `--configLoader runner` so the
  config can import workspace TS source — keep that flag.
- Performance is a core requirement: avoid allocations and re-renders in drag /
  game-loop hot paths; measure before and after optimising (`pnpm perf`).
  Never do expensive setup (e.g. creating an AudioContext) inside a pointer
  handler — prepare it during idle.
- Budgets live in `apps/web/scripts/bundle-size.ts` and `perf-drag.ts`;
  change them only together with the brief §6b and a decision-log entry.

## Iteration checklist (run at the end of every iteration)

1. `pnpm check` passes (typecheck → Biome → tests+coverage → Fallow → build → bundle size).
2. Review **warnings**, not just errors: editor LSP diagnostics, Biome warnings,
   and Fallow warnings (e.g. `private-type-leaks`, `css-*` rules). Fix them, or
   justify in place. Fallow suppressions require a reason
   (`require-suppression-reason` is on).
3. For changes to drag, rendering, effects or startup, run `pnpm perf` and
   compare with the budgets in the brief §6b. Bundle size is gated by `pnpm check`.
4. `docs/project-brief.md` and this file reflect the change.
