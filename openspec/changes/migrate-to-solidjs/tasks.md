# Tasks

## 1. Toolchain

- [ ] 1.1 Add Vite, vite-plugin-solid, TypeScript and solid-js; add `vite.config.ts` (base `./`) and `tsconfig.json` (Solid JSX, allowJs)
- [ ] 1.2 Turn `index.html` into the Vite entry: static markup plus `<script type="module" src="/src/main.tsx">`
- [ ] 1.3 Verify: `npm run build` succeeds and `dist/` contains only same-origin files

## 2. Split the single script into modules (no behaviour change)

- [ ] 2.1 `src/styles.css` from the inline `<style>`
- [ ] 2.2 `src/data/strings.js` (LN, U) and `src/data/levels.js` (PRO, LV)
- [ ] 2.3 `src/core/`: `util`, `icons`, `save`, `i18n` (TL behind getTL/setTL), `audio`, `fx`, `clock` (G, HUD, pop, flash, shakeEl, burstAt, makeCanvas)
- [ ] 2.4 `src/game/engines.js` with the eleven engines and their helpers
- [ ] 2.5 `src/legacy/screens.js` with all screens, screen state and global listeners
- [ ] 2.6 `?debug` test hook (`window.DQ`) and `scripts/smoke.cjs` checked into the repo
- [ ] 2.7 Verify: smoke test plays all 13 levels, 8 languages, pause and tab-hide with zero console errors; emoji scan of `dist/` is empty

## 3. First Solid screen: title

- [ ] 3.1 `src/ui/Icon.tsx` and `src/ui/bridge.ts` (version signal)
- [ ] 3.2 `src/ui/Title.tsx` replaces the title template; legacy `goTitle` only shows the section and refreshes
- [ ] 3.3 Verify: title renders in all 8 languages, sound and vibration toggles update in place, smoke test passes

## 4. Deploy and docs

- [ ] 4.1 `.github/workflows/deploy.yml`: install, build, `openspec validate --all --strict`, publish Pages
- [ ] 4.2 Update `CLAUDE.md` and add `README.md` for the new structure and commands
- [ ] 4.3 Verify: workflow file is valid YAML and the build it runs passes locally

## 5. Migrate remaining screens (one commit each)

- [ ] 5.1 Album screen and album card modal
- [ ] 5.2 Settings, language picker and reset confirmation
- [ ] 5.3 Map
- [ ] 5.4 Story and mission
- [ ] 5.5 Result, pause and finale modals
- [ ] 5.6 Game shell and HUD (engines mount into a Solid-owned stage)
- [ ] 5.7 Verify after each: smoke test passes with zero console errors

## 6. State and types

- [ ] 6.1 Replace the `save` object with a Solid store persisted to the same key; delete the bridge signal
- [ ] 6.2 Port core modules and engines to TypeScript with level and engine types
- [ ] 6.3 Delete `src/legacy/`
- [ ] 6.4 Verify: `tsc --noEmit` passes with `strict`; smoke test passes; old saves load

## 7. Close out

- [ ] 7.1 Archive the change with `openspec archive migrate-to-solidjs` so `delivery` specs are updated
