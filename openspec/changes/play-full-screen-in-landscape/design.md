# Design

## Context

`#app` is a column at most 480px wide. That is right for portrait phones and gives desktops a phone-shaped panel. Only the 3D journey widens it (`html.w3on`). A phone held sideways is about 360 to 430px tall and 800 to 930px wide, so the column leaves most of the screen empty. Screens built for portrait heights are cut off at the bottom.

Full screen needs a tap: browsers only allow `requestFullscreen` during the short "user activation" after a tap. The journey asked once, after a lazy load of three.js, which can take longer than that window on mobile data.

## Goals / Non-Goals

**Goals:**
- The whole game fills a phone held sideways.
- Real full screen on Android (browser and installed app).
- No screen cut off in landscape.
- Portrait unchanged.
- No new strings or dependencies.

**Non-Goals:**
- Landscape lock on iPhone (impossible for web pages).
- Redesigning portrait screens.
- Tablet-specific layouts.

## Decisions

**1. One breakpoint, CSS only.** All landscape rules sit in one block, `@media (orientation: landscape) and (max-height: 700px)`. It covers phones held sideways and small laptop windows. Taller windows keep the centred panel, which keeps desktops looking as they do today. Portrait matches nothing in the block. Rotation needs no script: the browser re-evaluates the query, and the existing resize handlers (`fxSize`, `G.onResize`, the world's `fit`) resize canvases.

**2. Notches through margins.** In landscape `#app` loses its 480px cap and gets left and right margins equal to the safe-area insets. Content never sits under a notch or a rounded corner, and no screen needs inset arithmetic of its own; the black page shows behind the notch like a bezel. The 3D world (outside `#app`) already pads its HUD.

**3. Layout per screen.**
- **Title:** a `tbrand` wrapper (hero, logo, tag) beside the buttons. In portrait the wrapper is `display: contents`, so nothing changes there.
- **Story:** the screen becomes a grid: bars and top row across, art on the left, text on the right.
- **Mission:** the icon on the left; the title, text, goal and the two buttons in a row on the right.
- **Mini-games:** fields already fill `#g-stage`. Anything sized by width is capped by the available height, written as `min(width cap, height × ratio)`:
  - Swipe, rangoli, simon and lights use a grid with the playfield in one column and the instructions, buttons and feedback in another.
  - Rhythm puts its lamps and feedback beside the drum.
  - The quiz shows its four answers in one row.
  - Memory switches to six columns by two rows (decks are twelve cards).
  - Tap, shield, slash and both runners already use the whole stage.
- **Menus:** `.mcard` widens and its button stack becomes a grid of columns. Primary, ghost and row buttons span the full width.
- **Result, finale and lamp card:** an `info` class lays them out in two columns: visual, title and stars on the left; text, lamp card and buttons on the right.
- **Album:** six columns.

**4. Full screen from taps.** `src/core/fullscreen.js` adds one click listener in the capture phase. It acts only on touch-first devices (`pointer: coarse`) that have the Fullscreen API, and only when the page is not already full screen. It calls `requestFullscreen({ navigationUI: 'hide' })`, then `screen.orientation.lock('landscape')`; both failures are ignored. Running in the capture phase means the very tap that starts the game is the one used. Requesting full screen consumes the tap's activation in Chrome, so buttons that need it themselves are skipped: the account screen (passkey dialogs) and anything marked `data-nofs` (share). The journey's own one-time request is removed. If the player leaves full screen, their next tap brings it back, as native games return to immersive mode. On iPhone, `requestFullscreen` does not exist for pages and nothing happens.

**5. Installed app.** The manifest uses `display: fullscreen` and `orientation: landscape`. Android hides the status and navigation bars and holds landscape. iOS treats it as standalone, with the translucent status bar already configured, and ignores the orientation.

**6. Testing.** The smoke test opens every screen at 863×360 (Pixel 7 sideways) and 844×390 (a common iPhone size sideways). It checks:
- no horizontal scroll;
- `#app` at full width;
- every visible button is fully on screen and at least 44px.

On an emulated touch phone, tapping "Begin the journey" must make the page full screen. With a mouse, it must not.

## Risks / Trade-offs

- **Leaving full screen.** A player who leaves full screen on purpose is returned on their next tap, which can surprise them. That matches what full-screen games do. The system's own back or swipe gesture still works each time.
- **Small laptop windows** (under 700px tall) now get the wide layout instead of the phone panel. It fits them better than a clipped column.
- **Long translations** may wrap more in narrower side columns. Columns use `minmax(0, …)` and text wraps; the smoke test runs every language in portrait, and landscape checks use English.
