/*
 * Smoke test for Deepa Quest. Run with `npm test` (builds first).
 * Serves dist/ with `vite preview`, drives every screen through the ?debug hook (window.DQ),
 * and fails on any console error, missing translation, misaligned story translation,
 * failed auto-pause, emoji in the build, broken offline play or failed installability.
 * Needs Playwright with Chromium available (`require('playwright')`).
 * Set SHOTS=<dir> to save screenshots.
 */
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');

// The main flows pin 2D (g3d=0); world3d() below covers the 3D journey platformer and runner (g3d=1).
const PORT = 4173, URL = `http://localhost:${PORT}/?debug&g3d=0`, SHOTS = process.env.SHOTS;
const root = path.join(__dirname, '..');
const fail = [];

function emojiScan(dir) {
  const re = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}\u{2B50}\u{2B55}\u{231B}\u{23F0}\u{23F8}]/u;
  for (const f of fs.readdirSync(dir, { recursive: true })) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isFile() && /\.(html|js|css)$/.test(p) && re.test(fs.readFileSync(p, 'utf8'))) fail.push(`emoji found in ${f}`);
  }
}

// Offline play, instant repeat loads and installability. Uses a normal (non-incognito) profile,
// because Chromium refuses installability checks in incognito windows.
async function offlineAndInstall() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'dq-pwa-'));
  const ctx = await chromium.launchPersistentContext(profile, { viewport: { width: 375, height: 667 } });
  try {
    const page = ctx.pages()[0] || await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(URL);
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
    await page.reload();
    if (!(await page.evaluate(() => !!navigator.serviceWorker.controller))) fail.push('service worker does not control the page');

    // Second launch: page, script and styles must come from the device. Both the page's own
    // requests and any download the service worker makes on its behalf count as network.
    const fromNetwork = [];
    const onResponse = r => { const t = r.request().resourceType(); if (['document', 'script', 'stylesheet'].includes(t) && !r.fromServiceWorker()) fromNetwork.push('page: ' + r.url()); };
    const onWorkerRequest = r => { if (r.serviceWorker() && !r.url().endsWith('/sw.js')) fromNetwork.push('worker: ' + r.url()); };
    page.on('response', onResponse);
    ctx.on('request', onWorkerRequest);
    await page.reload();
    await page.waitForSelector('#tp');
    page.off('response', onResponse);
    ctx.off('request', onWorkerRequest);
    if (fromNetwork.length) fail.push(`second launch downloaded shell files again: ${fromNetwork.join(', ')}`);

    // Flight mode: the game opens and a level plays.
    await ctx.setOffline(true);
    await page.reload();
    await page.waitForSelector('#tp');
    await page.evaluate(() => { const D = window.DQ; D.save.seen = true; D.openStory(D.LV[0], 0); D.startGame(D.LV[0], 0); });
    await page.waitForTimeout(2500);
    const playing = await page.evaluate(() => window.DQ.cur().L.id === 'ayodhya' && document.querySelectorAll('#g-stage .tgt').length > 0);
    if (!playing) fail.push('offline: the first level did not start');
    await page.evaluate(() => { const D = window.DQ; D.G.reset(); D.showResult(D.LV[0], 0, { stars: 2, line: 'offline' }); });
    if ((await page.evaluate(() => JSON.parse(localStorage.getItem('deepa-quest-v2')).stars.ayodhya)) !== 2) fail.push('offline: stars were not saved on the device');
    await ctx.setOffline(false);
    if (errors.length) fail.push(`offline page errors: ${errors.join(' | ')}`);

    // Installable, and nothing but the shell in the offline cache.
    const cdp = await ctx.newCDPSession(page);
    const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
    if (installabilityErrors.length) fail.push(`not installable: ${installabilityErrors.map(e => e.errorId).join(', ')}`);
    const cached = await page.evaluate(async () => {
      const out = [];
      for (const k of await caches.keys()) for (const r of await (await caches.open(k)).keys()) out.push(new URL(r.url).pathname);
      return out;
    });
    if (!cached.includes('/') || cached.some(p => p.startsWith('/api/'))) fail.push(`unexpected offline cache: ${cached.join(', ')}`);
  } finally {
    await ctx.close();
    fs.rmSync(profile, { recursive: true, force: true });
  }
}

// New versions reach an open game: at once on the title screen; mid-level only when the player goes
// to the map, which then opens again. The previous version's files stay on the device. A small server
// stands in for a deploy by changing the version in sw.js (browsers fetch it themselves, so a test
// route cannot change it).
async function newVersions() {
  const dist = path.join(root, 'dist'), types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
  let version = '';
  const server = http.createServer((req, res) => {
    const p = new globalThis.URL(req.url, 'http://x').pathname, f = path.join(dist, p.endsWith('/') ? p + 'index.html' : p);
    if (!f.startsWith(dist + path.sep) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
    let body = fs.readFileSync(f);
    if (p === '/sw.js') body = Buffer.from(String(body).replace(/(const VERSION = '[^']*)/, '$1' + version));
    res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    res.end(body);
  });
  await new Promise(r => server.listen(PORT + 1, r));
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'dq-upd-'));
  const ctx = await chromium.launchPersistentContext(profile, { viewport: { width: 375, height: 667 } });
  try {
    const page = ctx.pages()[0] || await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`http://localhost:${PORT + 1}/?debug&g3d=0`);
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
    await page.reload();
    await page.waitForSelector('#tp');
    const deploy = async v => { version = v; await page.evaluate(() => navigator.serviceWorker.getRegistration().then(r => r.update())).catch(() => { /* switched while asking */ }); };
    const switched = () => page.waitForFunction(() => !window.__old && window.DQ, null, { timeout: 10000 }).then(() => true, () => false);

    await page.evaluate(() => { window.__old = 1; });
    await deploy('b');
    if (!(await switched())) fail.push('update: the title screen did not switch to the new version');

    await page.evaluate(() => { window.__old = 1; const D = window.DQ; D.save.seen = true; D.persist(); D.openStory(D.LV[0], 0); D.startGame(D.LV[0], 0); });
    await deploy('c');
    await page.waitForTimeout(2500);
    if (!(await page.evaluate(() => window.__old === 1 && window.DQ.cur().L.id === 'ayodhya' && document.querySelector('#s-game.on')))) fail.push('update: a level was interrupted');
    await page.evaluate(() => { const D = window.DQ; D.G.reset(); D.goMap(); }).catch(() => { /* the page reloads */ });
    if (!(await switched())) fail.push('update: going to the map did not switch to the new version');
    else if (!(await page.waitForSelector('#s-map.on', { timeout: 5000 }).then(() => true, () => false))) fail.push('update: the map did not open again after switching');
    const kept = await page.evaluate(() => caches.keys());
    if (kept.length !== 2) fail.push(`update: expected the current and previous versions on the device, found ${kept.length}`);
    if (errors.length) fail.push(`update errors: ${errors.join(' | ')}`);
  } finally {
    await ctx.close();
    server.close();
    fs.rmSync(profile, { recursive: true, force: true });
  }
}

// The 3D journey platformer and the 3D runner, in landscape (headless Chromium renders WebGL in software).
async function world3d() {
  const b = await chromium.launch();
  try {
    const page = await (await b.newContext({ viewport: { width: 844, height: 390 } })).newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(URL.replace('g3d=0', 'g3d=1'));
    await page.evaluate(() => { const D = window.DQ; D.save.stars.ayodhya = 3; D.save.seen = true; D.persist(); D.goMap(); });
    await page.waitForSelector('.w3d canvas');
    const st = () => page.evaluate(() => window.DQ.world().state());
    const settle = (fn, ms = 10000) => page.waitForFunction(fn, null, { timeout: ms }).then(() => true, () => false);
    if (!(await settle(() => window.DQ.world().state().circle === 1))) fail.push('3D: the hero did not land in Govardhan\'s story circle');
    if (!(await page.evaluate(() => document.documentElement.classList.contains('w3on') && getComputedStyle(document.querySelector('#s-map')).visibility === 'hidden'))) fail.push('3D: the journey did not take over the screen');
    const small = await page.$$eval('.w3-top button, .w3-jump, .w3-act', bs => bs.filter(x => { const r = x.getBoundingClientRect(); return r.width && (r.width < 44 || r.height < 44); }).length);
    if (small) fail.push(`3D: ${small} journey buttons are smaller than 44px`);

    let s = await st();
    await page.keyboard.down('KeyW'); await page.waitForTimeout(500); await page.keyboard.up('KeyW');
    let s2 = await st();
    if (Math.hypot(s2.x - s.x, s2.z - s.z) < 0.5) fail.push('3D: W did not move the hero');
    await page.keyboard.press('Space');
    let top = s2.y;
    for (let k = 0; k < 15; k++) { await page.waitForTimeout(40); top = Math.max(top, (await st()).y); }
    if (top < s2.y + 0.6) fail.push('3D: Space did not jump');

    await page.keyboard.press('KeyM');
    await page.waitForSelector('#modal.on .tv');
    await page.click('#modal .tv [data-i="5"]');
    if (!(await page.$('.toast')) || !(await page.$('#modal.on'))) fail.push('3D: fast travel to a locked place was not refused');
    await page.click('#modal .tv [data-i="1"]');
    if (!(await settle(() => window.DQ.world().state().circle === 1))) fail.push('3D: fast travel did not reach Govardhan\'s story circle');
    if (!(await page.$('.w3-act:not([hidden])'))) fail.push('3D: no action button in the story circle');
    else {
      await page.click('.w3-act');
      await page.waitForTimeout(300);
      if ((await page.evaluate(() => window.DQ.cur().L.id)) !== 'braj') fail.push('3D: the action button did not open the story');
    }

    await page.evaluate(() => { const D = window.DQ; D.showResult(D.LV[1], 1, { stars: 2, line: 'x' }); });
    await page.waitForTimeout(400);
    await page.evaluate(() => window.DQ.goMap());
    if (!(await settle(() => window.DQ.world().state().open[2]))) fail.push('3D: winning Govardhan did not open the gate to Pawapuri');
    await page.waitForTimeout(1500);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, '3d-journey.png') });

    await page.evaluate(() => { const w = window.DQ.world(), n = w.state().next; w.put(n[0], n[1] + 1.5, n[2]); });
    if (!(await settle(() => window.DQ.world().state().lit > 0))) fail.push('3D: touching a diya did not light it');
    if (!(await page.evaluate(() => Object.values(window.DQ.save.lit || {}).some(v => v > 0)))) fail.push('3D: the lit diya was not saved');
    await page.evaluate(() => { const w = window.DQ.world(), p = w.state(); w.put(p.x, p.y - 20, p.z); });
    await page.waitForTimeout(300);
    if (!(await settle(() => { const p = window.DQ.world().state(); return p.grounded && p.y > -10; }))) fail.push('3D: a fall did not return the hero to a checkpoint');

    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    if (!(await page.$('#modal.on #xg'))) fail.push('3D: Escape did not open the menu');
    await page.keyboard.press('Escape');

    await page.evaluate(() => { const D = window.DQ; D.openStory(D.LV[8], 8); D.startGame(D.LV[8], 8); });
    await page.waitForTimeout(3500);
    if (!(await page.$('#g-stage canvas'))) fail.push('3D runner: no canvas');
    for (let k = 0; k < 4; k++) { await page.keyboard.press(k % 2 ? 'ArrowLeft' : 'ArrowRight'); await page.waitForTimeout(300); }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    if (!(await page.$('#pr'))) fail.push('3D runner: Escape did not pause'); else await page.click('#pr');
    await page.waitForTimeout(800);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, '3d-runner.png') });
    await page.evaluate(() => { const D = window.DQ; D.G.reset(); D.goMap(); });
    await page.waitForTimeout(500);
    if (errors.length) fail.push(`3D errors: ${errors.join(' | ')}`);
  } finally {
    await b.close();
  }
}

(async () => {
  emojiScan(path.join(root, 'dist'));
  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: root, stdio: 'ignore' });
  try {
    for (let i = 0; i < 50; i++) { try { await fetch(URL); break; } catch { await new Promise(r => setTimeout(r, 200)); } }
    const browser = await chromium.launch();
    const pg = await (await browser.newContext({ viewport: { width: 375, height: 667 } })).newPage();
    const errs = [];
    pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    pg.on('pageerror', e => errs.push('PAGEERR ' + e.message));
    const apiCalls = [];
    pg.on('request', r => { if (new globalThis.URL(r.url()).pathname.startsWith('/api/')) apiCalls.push(r.url()); });
    const shot = async n => { if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, n + '.png') }); };
    const wait = ms => pg.waitForTimeout(ms);

    await pg.goto(URL); await wait(400); await shot('01-title');
    // Solid title: toggling sound must update the same button in place, not rebuild it
    const before = await pg.$eval('#ts', e => { window.__ts = e; return e.getAttribute('aria-pressed'); });
    await pg.click('#ts');
    const [same, after] = await pg.evaluate(() => { const e = document.querySelector('#ts'); return [e === window.__ts, e.getAttribute('aria-pressed')]; });
    if (!same || after === before) fail.push('title sound toggle did not update in place');
    await pg.click('#ts');
    await pg.click('#tp'); await wait(300); await shot('02-prologue');
    for (let k = 0; k < 4; k++) { await pg.click('#sn'); await wait(150); }
    await wait(300); await shot('03-map');
    await pg.evaluate(() => { const D = window.DQ; D.LV.forEach(l => D.save.stars[l.id] = 1); D.persist(); D.renderMap(); });

    const n = await pg.evaluate(() => window.DQ.LV.length);
    for (let i = 0; i < n; i++) {
      await pg.evaluate(i => window.DQ.openStory(window.DQ.LV[i], i), i); await wait(250);
      if (await pg.$('#sl')) { await pg.click('#sl'); await wait(150); }
      await pg.click('#sk'); await wait(150);
      await pg.click('#sp'); await wait(1600);
      const ty = await pg.evaluate(() => window.DQ.cur().L.game.type);
      for (let r = 0; r < 10; r++) {
        if (ty === 'tap') for (const e of (await pg.$$('.tgt:not(.lit):not(.boom):not(.out)')).slice(0, 3)) { if (!(await e.evaluate(x => x.innerHTML.includes('guard')))) try { await e.click({ timeout: 200, force: true }); } catch {} }
        if (ty === 'quiz') { const o = await pg.$('.qo[data-k="0"]:not(.ok)'); if (o) try { await o.click({ timeout: 200 }); } catch {} }
        if (ty === 'swipe') { const y = await pg.$('.swb .yes'); if (y) await y.click(); }
        if (ty === 'lights') await (await pg.$$('.lc'))[r % 16].click();
        if (ty === 'rhythm') await pg.mouse.click(180, 400);
        if (ty === 'memory') { const c = await pg.$$('.mcd:not(.f)'); if (c[1]) { await c[0].click(); await c[1].click(); } }
        if (['slash', 'runner', 'shield'].includes(ty)) { await pg.mouse.move(60, 300); await pg.mouse.down(); await pg.mouse.move(320, 420, { steps: 6 }); await pg.mouse.up(); }
        await wait(250);
      }
      await shot(`g${i}-${ty}`);
      await pg.keyboard.press('Escape'); await wait(200);
      if (!(await pg.$('#pr'))) fail.push(`level ${i}: Escape did not open the pause menu`); else await pg.click('#pr');
      await pg.evaluate(i => { const D = window.DQ; D.G.reset(); D.showResult(D.LV[i], i, { stars: 3, line: 'smoke' }); }, i); await wait(1200);
    }
    await pg.evaluate(() => window.DQ.finale()); await wait(400); await shot('finale');
    await pg.evaluate(() => window.DQ.goAlbum('map')); await wait(300); await shot('album');
    await pg.evaluate(() => { window.DQ.goMap(); window.DQ.settings(); }); await wait(300); await shot('settings');
    await pg.click('#xr'); await pg.click('#cn'); await pg.click('#xl'); await wait(200); await shot('language');
    for (const l of ['hi', 'pa', 'bn', 'ta', 'gu', 'ne', 'ms', 'en']) {
      await pg.evaluate(l => { const D = window.DQ; D.closeModal(); D.save.lang = l; D.setUI(); D.goTitle(); }, l); await wait(150); await shot('title-' + l);
      await pg.evaluate(() => { const D = window.DQ; D.openStory(D.LV[0], 0); D.startGame(D.LV[0], 0); }); await wait(1300);
    }
    await pg.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
    if (!(await pg.evaluate(() => window.DQ.G.paused))) fail.push('hiding the tab did not pause the game');

    const report = await pg.evaluate(() => {
      const D = window.DQ, out = [];
      for (const l in D.U) for (const k of Object.keys(D.U.en)) if (D.U[l][k] == null) out.push(`missing UI string ${l}.${k}`);
      for (const L of D.LV.concat([D.PRO])) for (const [lg, v] of Object.entries(L.tr || {})) {
        if (v.s && v.s.length !== L.story.length) out.push(`${L.id}.${lg}: ${v.s.length} story lines, expected ${L.story.length}`);
        const g = L.game && (L.game.cards || L.game.items || L.game.pairs);
        if (v.x && g && v.x.length !== g.length) out.push(`${L.id}.${lg}: ${v.x.length} game texts, expected ${g.length}`);
      }
      return out;
    });
    if (apiCalls.length) fail.push(`guest play called the server: ${apiCalls[0]}`);
    fail.push(...report, ...errs.map(e => 'console: ' + e));
    await browser.close();
    await offlineAndInstall();
    await newVersions();
    await world3d();
  } finally { server.kill(); }
  if (fail.length) { console.error('SMOKE FAILED\n- ' + fail.join('\n- ')); process.exit(1); }
  console.log('Smoke test passed: 13 levels, 8 languages, pause, auto-pause, translations, offline play, instant reloads, installable, prompt updates, 3D journey and runner, no emoji, no console errors.');
})().catch(e => { console.error(e); process.exit(1); });
