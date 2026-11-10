# Proposal

## Why

The 3D journey made Deepa Quest a game you hold sideways, but only the journey fills the screen. On a phone held sideways, the title, stories, mini-games, results and menus sit in a 480px column with black bars on both sides, and several are cut off: the title's lower buttons, the mission's Play button, the result's buttons, and the memory, rangoli and lights grids. The browser's own bars also stay on screen. The game asks for full screen only once, after the journey has loaded, and by then browsers may refuse because the tap is too long ago. The owner wants the whole game full screen in landscape, like mobile action games.

## What Changes

- On touch devices, the tap that starts play puts the game in full screen and turns it to landscape, on browsers that allow it. If the player leaves full screen, the next tap goes back in. Desktop browsers are never put in full screen by the game.
- The installed app opens full screen in landscape, without status or navigation bars.
- On any screen wider than it is tall and under 700px tall, every screen uses the whole width and fits the height:
  - The title shows the logo and buttons side by side.
  - Story art sits beside the text, and the mission sits beside its icon.
  - Mini-games use the whole width, with grids sized to the height and memory cards in two rows.
  - Instructions sit beside the playfield instead of below it.
  - Results, lamp cards and the finale use two columns, and menus put their buttons in columns.
- Notches and rounded corners are kept clear.
- Portrait keeps today's layouts. Taller windows (tablets, desktops) keep the centred panel.

Out of scope:
- Forcing landscape on iPhone. Safari has no full-screen or orientation lock for web pages, so the game fills Safari's view, and Add to Home Screen gives full screen.
- A full-screen setting or button.
- New art.

Save data and level ids are unchanged.

## Capabilities

### New Capabilities
- `layout`: full screen and landscape on touch devices, the installed app's display, and how every screen uses a landscape screen.

### Modified Capabilities
- `delivery` (in `add-offline-and-install`): the installed app opens full screen in landscape instead of in either orientation.

## Impact

- `src/core/fullscreen.js` (new): full screen and landscape lock from taps. It replaces the journey's own one-time request in `src/world/platformer.ts`.
- `src/styles.css`: one landscape block.
- Small markup hooks:
  - `src/ui/Title.tsx`: a wrapper around the logo.
  - `src/legacy/screens.js`: classes on result, finale and lamp cards, plus a `data-nofs` attribute on the share button.
- `public/manifest.webmanifest`: `display: fullscreen`, `orientation: landscape`.
- Smoke test: every screen at two phone landscape sizes, and the full-screen request.
- Initial download grows by well under 1 KB gzipped.
