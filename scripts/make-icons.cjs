/*
 * Renders the installed-app icons from the diya in src/core/icons.js (the game's only icon source).
 * Run after changing the diya: node scripts/make-icons.cjs   (needs Playwright + Chromium)
 * Writes public/icons/{192,512,maskable-512,apple-180}.png, which are committed.
 */
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const root = path.join(__dirname, '..');
const out = path.join(root, 'public', 'icons');

(async () => {
  // icons.js imports browser helpers; give them just enough to load in Node.
  globalThis.window = { devicePixelRatio: 1 };
  globalThis.document = { querySelector: () => null, querySelectorAll: () => [] };
  globalThis.matchMedia = () => ({ matches: false });
  const { IC, PAL } = await import(pathToFileURL(path.join(root, 'src/core/icons.js')).href);
  const diya = IC.diya.map(([c, d, e]) => `<path fill="${PAL[c]}"${e ? ' fill-rule="evenodd"' : ''} d="${d}"/>`).join('');

  // scale = diya size as a share of the icon; maskable icons keep it inside the central safe zone.
  const icons = [
    { file: '192.png', size: 192, scale: 0.72 },
    { file: '512.png', size: 512, scale: 0.72 },
    { file: 'maskable-512.png', size: 512, scale: 0.56 },
    { file: 'apple-180.png', size: 180, scale: 0.70 },
  ];
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  for (const { file, size, scale } of icons) {
    const d = Math.round(size * scale);
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<!doctype html><html><body style="margin:0;width:${size}px;height:${size}px;display:grid;place-items:center;
      background:#1f1138">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${d}" height="${d}"
        style="filter:drop-shadow(0 0 ${Math.round(size / 18)}px #ff9d2e)">${diya}</svg></body></html>`);
    await page.screenshot({ path: path.join(out, file), clip: { x: 0, y: 0, width: size, height: size } });
    console.log('wrote', file);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
