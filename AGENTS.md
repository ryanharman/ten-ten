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

Planning phase. The workspace has not been scaffolded yet — no code, scripts or
configs exist. Commands below are the intended workflow and will be finalised
when scaffolding lands.

## Hard rules

- TypeScript strict mode. No `any` without a justifying comment.
- pnpm only (no npm/yarn lockfiles).
- Biome is the only linter/formatter.
- `packages/core` must stay pure: no DOM, React, React Native or platform imports.
- No hard-coded visual values — use design tokens.
- Performance is a core requirement: avoid allocations and re-renders in drag /
  game-loop hot paths; measure before and after optimising.

## Iteration checklist (run at the end of every iteration)

1. Type check / LSP diagnostics — zero errors.
2. Biome — lint + format clean; action or justify warnings.
3. Fallow — action or justify findings (dead code, unused exports/deps, duplication, complexity).
4. Tests pass.
5. `docs/project-brief.md` and this file reflect the change.
