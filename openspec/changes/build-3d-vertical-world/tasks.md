# Tasks

## 1. Engine setup

- [ ] 1.1 Add `three` as a lazily imported chunk (precached by the offline shell); renderer with DPR cap 1.5, render-on-demand, pause when hidden or off-screen
- [ ] 1.2 "3D world" setting (8 languages), saved; WebGL check and frame-time probe that falls back to 2D with a notice
- [ ] 1.3 Verify: initial bundle unchanged; `?g3d=0` passes the full smoke test

## 2. Vertical journey

- [ ] 2.1 Low-poly islands and landmarks for all 13 places, built in code; night sky with stars (Amavasya: no moon)
- [ ] 2.2 HTML place buttons projected over the islands; drag and wheel to climb, arrow keys and Enter; locked places refuse with the usual message
- [ ] 2.3 Jyoti the lamp spirit; diyas along the path light up for completed places; fly-to on a new unlock
- [ ] 2.4 Verify: smoke test opens every place from the 3D journey with no console errors

## 3. 3D runner

- [ ] 3.1 Kala Pani as a three-lane 3D runner with the same rules, timing and scoring as the 2D one
- [ ] 3.2 Verify: smoke test plays Kala Pani in 3D and in 2D

## 4. Licensed models (later, needs the owner's choice)

- [ ] 4.1 Pick one asset pack; replace landmark pieces with optimised GLB models listed in `public/models/CREDITS.md`

## 5. Close out

- [ ] 5.1 Update `CLAUDE.md` (3D rules, budgets) and archive the change
