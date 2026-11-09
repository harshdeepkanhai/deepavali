# Tasks

## 1. Assets (needs the owner's choice)

- [ ] 1.1 Pick one primary asset pack for characters and one for scenery (design.md, decision 3)
- [ ] 1.2 Add models under `public/models/`, optimise them with gltf-transform, and record each in `CREDITS.md`
- [ ] 1.3 Verify: every file is listed with source, author and licence; total per chapter under 1.5 MB

## 2. Engine setup

- [ ] 2.1 Add `three` as a lazily imported chunk; renderer with DPR cap, render-on-demand, pause on hidden tab
- [ ] 2.2 Frame-time probe and "Simple graphics" setting (8 languages) with 2D fallback
- [ ] 2.3 Verify: initial bundle size unchanged; 2D path passes `npm test`

## 3. Vertical journey

- [ ] 3.1 `Journey3D` Solid component: path, 13 places, locked states, camera follow, drag to scroll, tap to open
- [ ] 3.2 Jyoti as the player character with idle and walk animations
- [ ] 3.3 Verify: smoke test opens every place from the 3D journey; manual check on a mid-range phone

## 4. 3D runner

- [ ] 4.1 `E.runner3d` with the same rules, timing and scoring as `E.runner`
- [ ] 4.2 Verify: smoke test plays Kala Pani in 3D and in 2D fallback

## 5. Close out

- [ ] 5.1 Update `CLAUDE.md` (assets rules, budgets) and archive the change
