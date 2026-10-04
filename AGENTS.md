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

Steps 1–3, 4a and 4b done — playable web game with animations, sound, haptics and high score. Next: 4c (PWA/offline, portrait, icons).
See `docs/project-brief.md` §8 for the roadmap.

## Repo layout

```
apps/web/          Vite + React web client (@ten-ten/web)
packages/core/     Pure TS game engine (@ten-ten/core) — no DOM/React/platform code
packages/tokens/   Design tokens + themes (@ten-ten/tokens) — platform-agnostic; type-only imports from core
biome.json         Lint + format config
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
| `pnpm build` | Production build of the web app |
| `pnpm typecheck` | `tsc --noEmit` in every package (TypeScript 7) |
| `pnpm lint` / `pnpm lint:fix` | Biome check / auto-fix |
| `pnpm fallow` | Fallow with coverage (run `pnpm test` first): dead code, duplication, complexity/CRAP, boundaries |
| `pnpm test` | All tests in one Vitest run (root `vitest.config.ts`) with V8 coverage → `coverage/` |
| `pnpm bench` | Core hot-path benchmarks (`*.bench.ts`); run when touching `packages/core` hot paths |
| `pnpm check` | typecheck → lint → test → fallow — must pass before committing |

Adding deps: `pnpm --filter @ten-ten/<pkg> add <dep>` (add `-D` for dev deps).
Never add runtime dependencies to `packages/core` without logging a decision in the brief.

## Game engine (`packages/core`) quick reference

- Entry: `newGame(seed, rules?)` → `GameState`; `placePiece(state, trayIndex, row, col, rules?)` → `{ state, event } | null`.
- Drag hot paths (must stay allocation-free): `canPlace`, `previewLines`.
- Lines are a packed `LineMask` number — decode with `rowsOf` / `colsOf` / `countLines`.
- Scoring is pluggable via `GameRules.scoring`; piece odds via `GameRules.deck`.
- Tests sit next to source (`*.test.ts`); board fixtures use ASCII art via `src/test-utils.ts`.
- Details & rationale: `docs/project-brief.md` §4.

## Web app (`apps/web`) quick reference

- `src/game/`: `useGame` (state), `dragController` (pointer drag, framework-agnostic),
  `useDrag` (React binding), `boardPreview` (imperative preview), `geometry` (snapping maths).
- `src/feedback/`: `boardEffects` (place/clear animations via cell attributes), `sound`
  (Web Audio synth), `haptics`, `useFeedback` (orchestrates per move; sound setting).
- `src/storage.ts`: the only place that touches localStorage.
- `src/components/`: `BoardView` (memoised; children = 100 cells in row-major
  order — the preview relies on this), `Tray`, `PieceView` (sized by `--pitch`), `GameOver`.
- Styles are CSS Modules using token variables only.
- Never set React state from pointermove; keep per-frame work in the controller's rAF callback.
- Imperative cell attributes (`data-preview`, `data-clear`, `data-placed`, `data-clearing`)
  are owned by `boardPreview` / `boardEffects`; React must not manage them. Reset them on restart.
- Any new animation must respect `prefers-reduced-motion` and use duration/easing tokens.
- Tests run in happy-dom; component tests use Testing Library.
- UI changes: verify in a real browser at phone sizes (see brief §7, "Manual browser verification").

## Hard rules

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
  game-loop hot paths; measure before and after optimising.

## Iteration checklist (run at the end of every iteration)

1. `pnpm check` passes (typecheck → Biome → tests+coverage → Fallow).
2. Review **warnings**, not just errors: editor LSP diagnostics, Biome warnings,
   and Fallow warnings (e.g. `private-type-leaks`, `css-*` rules). Fix them, or
   justify in place. Fallow suppressions require a reason
   (`require-suppression-reason` is on).
3. For UI/perf-sensitive changes, check bundle size from `pnpm build` output.
4. `docs/project-brief.md` and this file reflect the change.
