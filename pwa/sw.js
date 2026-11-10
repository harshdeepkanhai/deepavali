// Offline cache for the game shell. The build fills in VERSION and FILES (see vite.config.ts):
// every file of one version is stored together, served from the device, and replaced together.
const VERSION = '__VERSION__';
const FILES = __FILES__;
const CACHE = 'shell-' + VERSION;
const scope = new URL(self.registration.scope);

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(FILES.map(f => new Request(new URL(f, scope), { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

// Keep the previous version as well: a page still running it may yet load its own lazily loaded
// files (the 3D journey) before it switches. Older versions go. Caches are listed oldest first.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).slice(0, -1).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  const path = url.pathname.slice(scope.pathname.length);
  // Live data, the health check and this worker always go to the network.
  if (path.startsWith('api/') || path === 'up' || path === 'sw.js') return;
  if (req.mode === 'navigate') {
    if (path !== '') return; // unknown pages: the server answers
    event.respondWith(fromCache(new URL('./', scope).href, req));
    return;
  }
  event.respondWith(fromCache(req, req));
});

// The current version answers first, so a page never mixes versions: hashed file names never
// collide, and the page itself always comes from the current version. A cache holds exactly one
// version of each file, so Vary headers (for example Vary: Origin on module scripts requested in
// CORS mode) must not cause a miss.
function fromCache(key, req) {
  const opts = { ignoreVary: true };
  return caches.open(CACHE).then(cache => cache.match(key, opts))
    .then(hit => hit || caches.match(key, opts))
    .then(hit => hit || fetch(req));
}
