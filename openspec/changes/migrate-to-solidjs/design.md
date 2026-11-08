# Design

## Context

Today: one `index.html` holding ~260 lines of CSS and a ~850-line script. Screens render with `innerHTML` template strings and reattach handlers on every render. Shared mutable globals: `save`, `TL` (current text language), `screen`, `cur`, `justUnlocked`, `escFn`. Eleven mini-game engines share `G` (pausable clock), `HUD`, `sfx` and the icon sprites. A Playwright smoke test exists but lives outside the repo.

## Goals / Non-Goals

**Goals:**
- Same game, same look, same save data, after every step. Each step is shippable on its own.
- Components with reactive state for screens; typed modules for core code.
- One build command; CI deploys to Pages.

**Non-Goals:**
- Rewriting the engines in JSX, or changing gameplay.
- A router, a CSS framework, or server rendering.

## Decisions

**1. SolidJS over Vue, Svelte, Qwik, React.**
- Solid: signals update the exact DOM node that changed, with no virtual-DOM diff; ~7 KB runtime; JSX is close to the current template strings; `onMount` and `ref` hand a real element to imperative canvas code. Best fit for a game where 60 fps loops must not compete with UI rendering.
- Vue 3: excellent, but ~35 KB with a virtual DOM; its single-file components would mean rewriting every template at once rather than gradually.
- Svelte 5: a close second (compiled, tiny). Solid wins on being plain TypeScript/JSX with no custom file format to learn alongside the migration.
- Qwik: built for server-rendered sites that resume on load; a static offline game gains nothing from it.
- React: virtual DOM plus a larger runtime than Solid, with no advantage here.

**2. Strangler migration, screen by screen.** Each `<section class="scr">` is owned either by legacy code or by one Solid component. A screen moves when its component is ready; the legacy `go*` function then only switches the visible section and notifies Solid. Order: title → album → settings and modals → map → story → result, pause, finale → game shell and HUD.

**3. Bridge signal while `save` is still a plain object.** `src/ui/bridge.ts` exports `ui()` (a version signal) and `refreshUI()`. Legacy code calls `refreshUI()` after changing language or settings; components read `ui()` inside their expressions so they recompute. A later step replaces `save` with a Solid store and deletes the bridge.

**4. Mutable globals become accessors.** `TL` moves into `core/i18n` behind `getTL()/setTL()` (ES module bindings cannot be reassigned by importers). Screen state stays module-private inside `legacy/screens.js` until each screen moves.

**5. Engines stay imperative, in JavaScript first.** They move file-for-file into `src/game/engines.js` unchanged apart from imports. Typing them is a later, separate step.

**6. Relative base path.** `vite.config.ts` uses `base: './'`, so the same build works at `/deepavali/` on Pages, at `/` locally, and from a sub-folder.

**7. Test hook.** With `?debug` in the URL, `window.DQ` exposes data and screen functions so `scripts/smoke.cjs` can drive every level headlessly. Without the flag nothing is exposed.

## Risks / Trade-offs

- Mixed architecture during migration → mitigated by finishing one screen per step, and by the smoke test covering all screens after every step.
- Contributors now need Node → documented in `CLAUDE.md` and `README`; the built site still needs nothing.
- GitHub Pages must be switched to the "GitHub Actions" source once by the repo owner, or the old branch deploy will serve the raw Vite entry, which does not run without a build.
- Bundle split into JS and CSS files: still same-origin, so the no-third-party rule holds.
