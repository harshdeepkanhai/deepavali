# Tasks

## 1. Install support

- [x] 1.1 `scripts/make-icons.cjs` renders the diya from the icon set into 192, 512, maskable 512 and Apple 180 PNGs
- [x] 1.2 `public/manifest.webmanifest`; manifest, Apple icon and title tags in `index.html`
- [x] 1.3 Server: manifest MIME type; Dockerfile copies `public/`
- [x] 1.4 Verify: Chromium reports no installability errors

## 2. Offline shell

- [x] 2.1 `pwa/sw.js`: precache, cache-first, atomic versions, never `/api/`
- [x] 2.2 Vite plugin writes `sw.js` with the file list and content version
- [x] 2.3 Register after load in production; CSP `worker-src 'self'`; Dockerfile copies `pwa/`
- [x] 2.4 Verify: second launch makes no requests for shell files; flight-mode launch plays a level; `/api/` is never cached; smoke and account tests pass

## 3. Docs

- [x] 3.1 README: offline and install notes, full Render deploy guide

## 4. Switching versions

- [ ] 4.1 `pwa/sw.js` keeps the previous version's cache and answers from it when the current one misses
- [ ] 4.2 A new version switches in at once on the title screen or 2D map, otherwise the next time the player goes to either; the same screen opens again
- [ ] 4.3 Verify: smoke test publishes new versions and sees the title switch, a level left alone, the map switch and reopen, and two versions kept
- [ ] 4.4 README: when updates arrive
