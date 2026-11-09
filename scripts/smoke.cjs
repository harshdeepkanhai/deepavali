/*
 * Smoke test for Deepa Quest. Run with `npm test` (builds first).
 * Serves dist/ with `vite preview`, drives every screen through the ?debug hook (window.DQ),
 * and fails on any console error, missing translation, misaligned story translation,
 * failed auto-pause, or emoji in the build.
 * Needs Playwright with Chromium available (`require('playwright')`).
 * Set SHOTS=<dir> to save screenshots.
 */
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const PORT = 4173, URL = `http://localhost:${PORT}/?debug`, SHOTS = process.env.SHOTS;
const root = path.join(__dirname, '..');
const fail = [];

function emojiScan(dir) {
  const re = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}\u{2B50}\u{2B55}\u{231B}\u{23F0}\u{23F8}]/u;
  for (const f of fs.readdirSync(dir, { recursive: true })) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isFile() && /\.(html|js|css)$/.test(p) && re.test(fs.readFileSync(p, 'utf8'))) fail.push(`emoji found in ${f}`);
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
  } finally { server.kill(); }
  if (fail.length) { console.error('SMOKE FAILED\n- ' + fail.join('\n- ')); process.exit(1); }
  console.log('Smoke test passed: 13 levels, 8 languages, pause, auto-pause, translations, no emoji, no console errors.');
})().catch(e => { console.error(e); process.exit(1); });
