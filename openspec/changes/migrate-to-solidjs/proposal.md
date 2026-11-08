# Proposal

## Why

The whole game is one 200 KB `index.html` with a single 900-line script. Every screen rebuilds itself from HTML strings, all state is shared globals, and there are no types. It works, but each new place, language or screen gets riskier to add. Moving to SolidJS with a Vite build gives us components, fine-grained reactive updates (no virtual DOM, so the 60 fps canvas games keep their budget), modules and TypeScript, while shipping a ~7 KB runtime.

## What Changes

- Add a Vite + SolidJS + TypeScript toolchain; `npm run build` produces a static `dist/` for GitHub Pages.
- Split the single script into modules: data (levels, strings), core (icons, i18n, save, audio, effects, clock), game engines, and screens.
- Migrate screens to Solid components **one at a time** (strangler pattern). Screens not yet migrated keep working through the existing imperative code. The title screen goes first.
- Keep the mini-game engines imperative: they are canvas and pointer code driven by the pausable clock, and Solid mounts them, it does not re-render them.
- Deploy through a GitHub Actions workflow that builds, validates specs and publishes Pages.
- **BREAKING (for contributors only):** the repo now needs Node 20.19+ and `npm install`; `index.html` alone is no longer the game.

Out of scope: new places, new languages, gameplay or balance changes, visual redesign, service-worker offline caching, server rendering.

Save data and level ids are untouched: the localStorage key stays `deepa-quest-v2` and no id changes, so players keep their stars.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `delivery`: removes "Self-contained page" (no build step) and adds "Static same-origin bundle" and "Automated deployment"; the no-third-party-requests rule is kept.

## Impact

- Code: `index.html` becomes a Vite entry; new `src/` tree, `vite.config.ts`, `tsconfig.json`, `.github/workflows/deploy.yml`, `scripts/smoke.cjs`.
- Dependencies: `solid-js` (runtime); `vite`, `vite-plugin-solid`, `typescript`, `@fission-ai/openspec` (dev).
- Hosting: GitHub Pages source must be switched from "Deploy from a branch" to "GitHub Actions".
- Docs: `CLAUDE.md` rules 1 and 5 change (no longer single-file / no-build).
