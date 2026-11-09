# Design

## Context

The build outputs `index.html`, one hashed script and one hashed stylesheet under `a/`. The Go server serves `/` and hashed assets (immutable caching) and returns the same 404 for everything else, including `/index.html`. `/api/` is live data. The site may run under a sub-path, so every URL must be relative to the service worker's scope.

## Goals / Non-Goals

**Goals:** instant second launch, full offline play, installability, no stale or mixed versions, no new dependencies.

**Non-Goals:** push, background sync, caching API responses, a custom install prompt.

## Decisions

**1. Hand-written service worker, no Workbox.** About 50 lines: precache on install, cache-first on fetch, delete old caches on activate. No library code to trust, update or fingerprint.

**2. Build-time file list.** A Vite plugin runs after the build, lists every output file, hashes their contents into a version string, and writes `sw.js` from `pwa/sw.js` with the list and version filled in. Any change to any file changes `sw.js`, which is how browsers detect an update.

**3. One versioned cache, served atomically.** Navigation to the scope root is answered from the cache with the `index.html` stored by the same version as its scripts. Other same-origin GET requests are answered cache-first. `skipWaiting` and `clients.claim` make the new version take over in the background; open pages keep running the code they already loaded, and the next launch is entirely the new version.

**4. Never touched:** `/api/*`, `/up`, `sw.js` itself, unknown page paths (the server's 404 stays the server's), non-GET requests and other origins.

**5. Icons.** `scripts/make-icons.cjs` loads the real icon paths from `src/core/icons.js` and renders the diya on the game's background with Chromium: 192 and 512 px, a 512 px maskable icon with the diya inside the safe zone, and a 180 px Apple touch icon. The PNGs are committed, so builds need no browser.

**6. Registration** happens after the `load` event in production builds only, so it never competes with the first paint and never caches dev-server files.

## Risks / Trade-offs

- A deploy reaches players on their second launch after it, not their first. That is the price of never mixing versions.
- If a player clears site data, the next launch is a normal online first visit.
- Old pages that later request an asset deleted by a new deploy would fail; the game has no lazily loaded assets today. The 3D change must keep chapter models versioned the same way.
