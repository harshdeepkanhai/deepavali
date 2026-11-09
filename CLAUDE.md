# CLAUDE.md · Deepa Quest

## What this is
A mobile-first web game that teaches why Diwali is celebrated across India and the world.
The player travels 13 places: in 3D, a landscape third-person platformer (run, jump, light diyas);
without WebGL, a 2D map. Each place = story panels → mission → one quick mini-game
→ 0–3 stars → a collectible "lamp card" fact. Playable in 8 languages: English, हिन्दी, ਪੰਜਾਬੀ,
বাংলা, தமிழ், ગુજરાતી, नेपाली, Bahasa Melayu. Hosted on Render (game + Go server + PostgreSQL).

**Open changes** (read their design.md and tasks.md before touching that area):
- `migrate-to-solidjs`: screens move to Solid one at a time; the rest are still in `src/legacy/`.
- `add-accounts-and-cloud-save`: Go server, passkeys, cloud save, hardening, Render deploy.
- `build-3d-journey-platformer`: landscape 3D journey platformer and 3D runner with three.js; art built in code for now.

## Golden rules
1. Stack: Vite + SolidJS + TypeScript for the game; Go (standard library + go-webauthn + pgx) for `server/`;
   PostgreSQL. No other frameworks.
2. No third-party requests at runtime: no CDNs, web fonts, images, audio or analytics. Sound = Web Audio (`sfx`).
   The CSP enforces this: scripts only from our origin, no inline scripts, no `eval`.
3. **No emoji, anywhere.** Art = the SVG path icon set `IC` (`src/core/icons.js`) + CSS + canvas.
   `npm test` scans the build for emoji.
4. Mobile first: menus, stories and mini-games are 360–430px portrait first and must work in landscape;
   the 3D journey is landscape first and full screen. Touch, safe-area insets. Desktop shows a centred
   phone frame over the 3D world.
5. Fast: one animation loop via `G.loop`, canvas sprites cached by `sprite()`/`spr()`, no DOM creation
   inside canvas loops, no Solid re-renders driven by game frames. Budget: ~75 KB gzipped initial.
   The 3D journey runs its own loop and stops whenever a story, game or menu covers it.
6. Cultural accuracy beats features. Every story line, quiz answer and card fact must be checkable.
   Where traditions differ, write "in many tellings". Stay respectful to every faith and region.
   Translations need a native-speaker review before they are treated as final.
7. Tap targets ≥ 44px. Respect `prefers-reduced-motion`. Keyboard works (arrows, Space, Enter, Esc).
8. Spec first: behaviour changes go through OpenSpec (below). `openspec/specs/` is the source of truth.
9. Server security: passkeys only, no personal data, parameterised SQL only, strict JSON decoding,
   never log tokens, codes, passkey material or client addresses, and never return internal error text
   (use `a.internal(w, err)`). Responses must not name the server, framework or database.
10. Level ids are save keys on the device **and** in `server/progress.go` (`levelIDs`). Keep both in sync.
11. Offline: every build output file except `icons/` is precached as one version by `pwa/sw.js`.
    Never cache `/api/`. Do not add lazily loaded chunks without versioning them the same way.
12. 3D (`src/world/`): three.js only in lazily loaded chunks, art built in code (or licensed models with
    credits), no weapons or combat, and every level stays playable in 2D (`save.lite`, `?debug&g3d=0`).

## Commands
| | |
|---|---|
| `npm install` | once, Node 20.19+ |
| `npm run dev` | dev server with hot reload (http://localhost:5173) |
| `npm run build` | type-check (`tsc`) and build to `dist/` |
| `npm test` | build, then `scripts/smoke.cjs`: plays all 13 levels and 8 languages headlessly; fails on console errors, missing translations, emoji, broken pause. Needs Playwright + Chromium. `SHOTS=dir` saves screenshots. |
| `npm run spec:validate` | `openspec validate --all --strict` |
| `cd server && go test ./...` | server unit tests; with `TEST_DATABASE_URL` also the migration test |
| `node scripts/make-icons.cjs` | re-render the app icons in `public/icons/` after changing the diya |
| `TEST_DATABASE_URL=... node scripts/e2e-accounts.cjs` | real server + PostgreSQL + Chromium virtual passkeys: 36 checks (UI, API, attacks). Throwaway database only. |

## OpenSpec workflow
- `openspec/specs/<capability>/spec.md` = current behaviour: journey, mini-games, localization,
  visual-assets, persistence, accessibility, delivery.
- New work: `/opsx:propose "<idea>"` (or `openspec new change <name>`) → proposal, delta specs, design, tasks.
- Build it: `/opsx:apply`, ticking `tasks.md` as you go, one commit per task group.
- Done: `openspec archive <name>` merges the deltas into `openspec/specs/`.
- `openspec/config.yaml` holds project constraints that every proposal must respect.

## File map
```
index.html              Vite entry: app shell markup only
src/main.tsx            boot: icons, mount Solid screens, start legacy screens
src/styles.css          all styles
src/ui/                 Solid components: Icon, Title, Account; bridge.ts (temporary refreshUI/ui/tr signal)
src/net/                api.ts (passkey + account client), sync.ts (best-score cloud sync, signed-in hint)
src/legacy/screens.js   screens not yet migrated, screen state, global listeners, fast travel, ?debug hook
src/world/              3D, lazily loaded: platformer.ts (the journey: physics, camera, HUD, gates, diyas),
                        course.ts (the course table), places.ts (islands, landmarks, gates, platforms),
                        hero.ts, controls.ts (joystick, look, keys), kit.ts (shared pieces), runner.ts (Kala Pani)
src/game/engines.js     E[type] mini-game engines + field/rel/segDist/keys
src/core/               util, icons (IC, ic, stars, sprite, spr), save, i18n (t, getTL/setTL, X, lgOf, gcfg),
                        audio (sfx, buzz), fx (particles), clock (G, HUD, pop, flash, shakeEl, makeCanvas)
src/data/               strings.js (LN, U), levels.js (PRO, LV)
scripts/smoke.cjs       headless smoke test (guest play with zero /api calls, offline play, installability,
                        the 3D journey and runner in landscape)
pwa/sw.js               service worker template; the build fills in the file list and version
public/                 manifest.webmanifest and icons/ (rendered from the diya; the only raster images)
scripts/e2e-accounts.cjs  account and attack tests against the real server
server/                 Go server: httpx.go (headers, limits, errors), static.go, auth.go (passkeys,
                        sessions, recovery), progress.go (cloud save, deletion), db.go + migrations/
openspec/               specs, changes, config
Dockerfile, render.yaml build and deploy on Render (distroless image, private PostgreSQL)
.github/                CI (tests, spec validation, govulncheck, npm audit) and Dependabot
SECURITY.md             reporting, controls, incident runbook
```

## Migrating a screen to Solid (tasks.md group 5)
1. Write `src/ui/<Screen>.tsx`; keep the element ids the smoke test uses.
2. Read legacy state through `ui()` / `tr()` until `save` becomes a store.
3. Mount it once in `main.tsx`; reduce the legacy `go<Screen>()` to show-section + `refreshUI()`.
4. `npm test`, tick the task, commit.

## Level schema (`LV[]` in `src/data/levels.js`)
`{id, name, where, icon, color, deco, chap?, ll?, sbg, gbg, gdeco?, story:[[[iconNames…], text]…], mission, goalText, game:{type, …cfg}, card:[icon, title, fact], tr?}`
- `id` is the save key. Never rename a shipped id (players would lose their stars).
- Icons are `IC` names. `chap` is a `U` key (`ch1`…`ch5`).
- `ll` = the place's own language(s), offered as a story toggle (English ⇄ UI language ⇄ `ll`).
- `tr[lang] = {n, w, s:[panel texts], m, g, u?, c:[title, fact], x?}`; missing fields fall back to English.
  `x` translates game content in the same order as the English cfg.
- Unlocking is linear: level i opens when level i−1 has ≥ 1 star.

## Engine contract
`E[type] = (stage, cfg, done) => { … }`. Build UI inside `field(stage, cssClass)`. Never add listeners
to stage or window directly; use `keys(fn)`. Time everything with `G.now()` / `G.loop()`. All text via `t()`.
Call `done({stars, line})` exactly once. Engines stay imperative; Solid only mounts them.

| type | used by | cfg |
|---|---|---|
| tap | Ayodhya, Amritsar | good, bad? (icon names), badRate?, dim?, goal, time, spawn, min, accel, life, unit |
| shield | Govardhan | time |
| swipe | Pawapuri | cards: [icon, statement, 1 or 0, explanation] |
| rhythm | Kolkata | none |
| slash | Goa & Tamil Nadu | goal, time |
| rangoli | Gujarat | none |
| quiz | Nepal, Finale | per, order?, pick?, items: [question, 4 answers (correct first), explanation] |
| runner | Kala Pani | time |
| simon | Trinidad | goal |
| memory | Malaysia & Singapore | pairs: [word, meaning] |
| lights | Leicester | none |

## Save
localStorage `deepa-quest-v2` = `{stars:{levelId:0-3}, snd, hap, seen, lang, big, lite, lit:{levelId:bitmask}}`.
`lite` = 3D off; `lit` = diyas lit in the 3D journey, one bit per diya in course order. Cloud save syncs stars only.
Breaking change → bump `KEY`.

## 3D journey (`src/world/`)
- Controls: left-side floating joystick, drag right side to look, jump and action buttons; WASD or arrows,
  Space, F or Enter, Q/E to turn, M for the map, Esc for the menu.
- The course is the `STRETCHES` table in `course.ts`: one stretch per pair of places, platforms measured
  from the previous one. Jump reach is about 1.6 up and 4 across at a full run; bounce pads go higher.
  Changing a stretch's diyas resets that place's lit diyas (acceptable: they do not affect progress).
- Places are hub islands with a story circle (action button opens the story) and a gate of light that
  opens with the usual unlock rule. Falls return the player to the last checkpoint. Fast travel (map button)
  reaches any unlocked place.
- Tests: `?debug&g3d=1` forces 3D (skips the frame-time probe), `?debug&g3d=0` forces 2D;
  `DQ.world().state()` / `.put(x, y, z)` / `.travel(i)` drive the journey.

## Deploy
Render builds `Dockerfile` from the repository on every push (Blueprint: `render.yaml`).
Set `PUBLIC_ORIGIN` to the live address once. See README.md and SECURITY.md.
