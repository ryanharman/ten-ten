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

Step 1 (tooling & workspace) done. Next: step 2 — game engine in `packages/core`.
See `docs/project-brief.md` §8 for the roadmap.

## Repo layout

```
apps/web/          Vite + React web client (@ten-ten/web)
packages/core/     Pure TS game engine (@ten-ten/core) — no DOM/React/platform code
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
| `pnpm fallow` | Fallow: dead code, duplication, complexity, boundaries |
| `pnpm test` | Vitest in every package |
| `pnpm check` | All of the above in sequence — must pass before committing |

Adding deps: `pnpm --filter @ten-ten/<pkg> add <dep>` (add `-D` for dev deps).
Never add runtime dependencies to `packages/core` without logging a decision in the brief.

## Hard rules

- TypeScript strict mode. No `any` without a justifying comment.
- pnpm only (no npm/yarn lockfiles).
- Biome is the only linter/formatter.
- `packages/core` must stay pure: no DOM, React, React Native or platform imports.
  Enforced by: `lib` without DOM in its tsconfig, and Fallow boundary zones
  (`core` may import nothing; `web` may import `core`).
- No hard-coded visual values — use design tokens.
- Performance is a core requirement: avoid allocations and re-renders in drag /
  game-loop hot paths; measure before and after optimising.

## Iteration checklist (run at the end of every iteration)

1. `pnpm check` passes (typecheck → Biome → Fallow → tests).
2. Review **warnings**, not just errors: editor LSP diagnostics, Biome warnings,
   and Fallow warnings (e.g. `private-type-leaks`, `css-*` rules). Fix them, or
   justify in place. Fallow suppressions require a reason
   (`require-suppression-reason` is on).
3. For UI/perf-sensitive changes, check bundle size from `pnpm build` output.
4. `docs/project-brief.md` and this file reflect the change.
