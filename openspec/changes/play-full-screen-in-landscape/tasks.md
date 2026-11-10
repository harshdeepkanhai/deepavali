# Tasks

## 1. Full screen

- [x] 1.1 `src/core/fullscreen.js`: capture-phase tap listener on touch devices; full screen, then landscape lock; skip the account screen and `data-nofs`; drop the journey's one-time request
- [x] 1.2 Manifest: `display: fullscreen`, `orientation: landscape`
- [x] 1.3 Verify: on an emulated touch phone the Play tap makes the page full screen; with a mouse it does not

## 2. Landscape layouts

- [x] 2.1 `#app` full width with safe-area margins; title in two columns
- [x] 2.2 Story beside its art; mission beside its icon
- [x] 2.3 Mini-games: swipe, rhythm, rangoli, quiz, simon, memory and lights fit the height
- [x] 2.4 Menus in columns; result, finale and lamp card in two columns; album in six columns
- [x] 2.5 Verify: smoke test checks every screen at 863×360 and 844×390 (no horizontal scroll, full width, every button on screen and at least 44px); screenshots reviewed

## 3. Close out

- [x] 3.1 Update `CLAUDE.md`, `README.md` and `openspec/config.yaml` (landscape rules, iPhone note)
- [x] 3.2 Verify: `npm test`, account tests, each commit builds
