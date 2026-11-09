# Tasks

## 1. Engine setup

- [ ] 1.1 Add `three` as a lazily imported chunk (precached by the offline shell); renderer with DPR cap 1.5; stop rendering when covered or hidden
- [ ] 1.2 "3D world" setting (8 languages), saved; WebGL check and frame-time probe that lowers resolution, then falls back to 2D with a notice
- [ ] 1.3 Verify: initial bundle unchanged; `?g3d=0` passes the full smoke test

## 2. Journey platformer

- [ ] 2.1 Low-poly hero (child traveller) with run, jump and idle poses; Jyoti beside them; blob shadow
- [ ] 2.2 Controls: floating joystick, look drag, jump and action buttons (multi-touch); keyboard and mouse; orbit camera that eases behind the hero
- [ ] 2.3 Kinematic movement: one-way platforms, solid landmarks and gates, moving, spinning and bounce platforms, coyote time, jump buffer, checkpoints and forgiving falls
- [ ] 2.4 Course for all 13 places from a table: islands with landmarks, story circles, beacon on the next place, gates of light, themed paths; night sky without a moon (Amavasya)
- [ ] 2.5 Diyas to light, counted per place and saved as a bitmask
- [ ] 2.6 HUD (place, stars, diyas, map, album, settings, home), fast travel, bridge building after a first win, landscape and fullscreen request, rotate hint
- [ ] 2.7 Verify: smoke test moves, jumps, lights a diya, fast-travels, opens a story from a circle and sees a gate open, in landscape, with no console errors

## 3. 3D runner

- [ ] 3.1 Kala Pani as a three-lane 3D runner with the same rules, timing and scoring as the 2D one
- [ ] 3.2 Verify: smoke test plays Kala Pani in 3D and in 2D

## 4. Licensed models (later, needs the owner's choice)

- [ ] 4.1 Pick one asset pack; replace pieces with optimised GLB models listed in `public/models/CREDITS.md`

## 5. Close out

- [ ] 5.1 Update `CLAUDE.md` (3D rules, landscape, budgets) and `README.md`
- [ ] 5.2 Archive the change
