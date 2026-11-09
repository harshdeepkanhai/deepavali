# Tasks

## 1. Install support

- [ ] 1.1 `scripts/make-icons.cjs` renders the diya from the icon set into 192, 512, maskable 512 and Apple 180 PNGs
- [ ] 1.2 `public/manifest.webmanifest`; manifest, Apple icon and title tags in `index.html`
- [ ] 1.3 Server: manifest MIME type; Dockerfile copies `public/`
- [ ] 1.4 Verify: Chromium reports no installability errors

## 2. Offline shell

- [ ] 2.1 `pwa/sw.js`: precache, cache-first, atomic versions, never `/api/`
- [ ] 2.2 Vite plugin writes `sw.js` with the file list and content version
- [ ] 2.3 Register after load in production; CSP `worker-src 'self'`; Dockerfile copies `pwa/`
- [ ] 2.4 Verify: second launch makes no requests for shell files; flight-mode launch plays a level; `/api/` is never cached; smoke and account tests pass

## 3. Docs

- [ ] 3.1 README: offline and install notes, full Render deploy guide
