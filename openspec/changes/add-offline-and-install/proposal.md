# Proposal

## Why

Every launch downloads the game again, and with no network it does not open at all. Many players are on mobile data, in places with patchy coverage, or on Render's free plan, where the server sleeps and the first request takes about a minute. The game should open instantly after the first visit, work offline, and be installable on a phone's home screen like an app.

## What Changes

- A web app manifest (name, icons, any orientation, standalone, theme colours) so Android, desktop and iOS can install the game.
- A small hand-written service worker. On first visit it stores the whole game shell (page, script, styles, icons, manifest) in one versioned cache. Later launches load from that cache with no download.
- Atomic, prompt updates: a new version downloads in the background and switches in at the next calm moment (the title screen or the map), and a page never mixes files from two versions.
- Account and sync requests (`/api/`) always go to the network and are never stored.
- App icons are PNG files rendered from the existing diya icon, the only raster images in the game.

Out of scope: push notifications, background sync, an in-game install button, caching 3D models (handled when `build-3d-journey-platformer` lands).

Save data and level ids are unchanged.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `delivery`: adds installability, offline play, instant repeat loads, atomic and prompt updates, and never caching live data.
- `visual-assets`: adds app icons rendered from the icon set.

## Impact

- New: `public/manifest.webmanifest`, `public/icons/*.png`, `pwa/sw.js`, `scripts/make-icons.cjs`; a build step in `vite.config.ts` that writes `sw.js` with the file list and version.
- `index.html` (manifest and icon links), `src/main.tsx` (registration), `server/` (manifest MIME type, `worker-src` in the CSP), `Dockerfile` (copies `public/` and `pwa/`).
- About 96 KB of icons, downloaded only when installing; no new runtime dependencies.
