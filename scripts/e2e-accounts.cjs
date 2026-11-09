/*
 * End-to-end test for accounts: real server, real PostgreSQL, Chromium with a virtual passkey device.
 * Usage: TEST_DATABASE_URL=postgres://... node scripts/e2e-accounts.cjs   (run `npm run build` first)
 * The database should be a throwaway one: the test creates accounts in it.
 */
const { spawn, execFileSync } = require('node:child_process');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.join(__dirname, '..');
const PORT = 8099, ORIGIN = `http://localhost:${PORT}`;
const DB = process.env.TEST_DATABASE_URL;
if (!DB) { console.error('Set TEST_DATABASE_URL'); process.exit(2); }

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok }); console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : '  ' + detail}`); };

// Runs inside the page: the same JSON shapes the game client uses.
const PAGE_HELPERS = () => {
  const dec = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); s += '='.repeat((4 - s.length % 4) % 4); return Uint8Array.from(atob(s), c => c.charCodeAt(0)).buffer; };
  const enc = b => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const call = async (method, url, body) => {
    const r = await fetch(url, method === 'GET' ? {} : { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
    const text = await r.text();
    return { status: r.status, body: text ? JSON.parse(text) : null };
  };
  window.T = {
    call,
    async signUp() {
      const begin = await call('POST', '/api/register/begin');
      if (begin.status !== 200) return begin;
      const o = begin.body.publicKey;
      o.challenge = dec(o.challenge); o.user.id = dec(o.user.id);
      (o.excludeCredentials || []).forEach(c => { c.id = dec(c.id); });
      const c = await navigator.credentials.create({ publicKey: o });
      return call('POST', '/api/register/finish', { id: c.id, rawId: enc(c.rawId), type: c.type, authenticatorAttachment: c.authenticatorAttachment,
        clientExtensionResults: c.getClientExtensionResults(),
        response: { clientDataJSON: enc(c.response.clientDataJSON), attestationObject: enc(c.response.attestationObject), transports: c.response.getTransports ? c.response.getTransports() : [] } });
    },
    async assertion() {
      const begin = await call('POST', '/api/login/begin');
      const o = begin.body.publicKey;
      o.challenge = dec(o.challenge);
      (o.allowCredentials || []).forEach(c => { c.id = dec(c.id); });
      const c = await navigator.credentials.get({ publicKey: o });
      return { id: c.id, rawId: enc(c.rawId), type: c.type, authenticatorAttachment: c.authenticatorAttachment,
        clientExtensionResults: c.getClientExtensionResults(),
        response: { clientDataJSON: enc(c.response.clientDataJSON), authenticatorData: enc(c.response.authenticatorData), signature: enc(c.response.signature), userHandle: c.response.userHandle ? enc(c.response.userHandle) : null } };
    },
    async signIn() { return call('POST', '/api/login/finish', await this.assertion()); },
  };
};

(async () => {
  const bin = path.join(os.tmpdir(), 'dq-e2e-server');
  execFileSync('go', ['build', '-o', bin, '.'], { cwd: path.join(root, 'server'), stdio: 'inherit' });
  const logs = [];
  const srv = spawn(bin, [], { env: { ...process.env, PORT: String(PORT), PUBLIC_ORIGIN: ORIGIN, DATABASE_URL: DB, STATIC_DIR: path.join(root, 'dist'), CLIENT_IP_HEADER: '' } });
  srv.stdout.on('data', d => logs.push(String(d))); srv.stderr.on('data', d => logs.push(String(d)));
  let browser;
  try {
    for (let i = 0; i < 50; i++) { try { await fetch(ORIGIN + '/up'); break; } catch { await new Promise(r => setTimeout(r, 200)); } }
    browser = await chromium.launch();
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(ORIGIN + '/');
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('WebAuthn.enable');
    await cdp.send('WebAuthn.addVirtualAuthenticator', { options: { protocol: 'ctap2', transport: 'internal', hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true } });
    await page.evaluate(PAGE_HELPERS);
    const T = (fn, ...args) => page.evaluate(([fn, args]) => window.T[fn](...args), [fn, args]);

    const home = await fetch(ORIGIN + '/');
    check('home page has CSP and no Server header', home.headers.get('content-security-policy')?.includes("script-src 'self'") && !home.headers.get('server') && !home.headers.get('x-powered-by'));

    check('signed out at start', (await T('call', 'GET', '/api/me')).status === 401);
    const up = await T('signUp');
    check('sign-up with passkey', up.status === 200 && /^[A-Z][a-z]+ [A-Z][a-z]+ \d{4}$/.test(up.body?.name) && up.body?.codes?.length === 10, JSON.stringify(up));
    const codes = up.body?.codes || [];
    let me = await T('call', 'GET', '/api/me');
    check('me after sign-up', me.status === 200 && me.body.name === up.body?.name && me.body.passkeys === 1 && me.body.codesLeft === 10, JSON.stringify(me));

    const cookies = await ctx.cookies();
    const s = cookies.find(c => c.name === '__Host-s');
    check('session cookie is HttpOnly, Secure, SameSite=Strict', s && s.httpOnly && s.secure && s.sameSite === 'Strict', JSON.stringify(s));
    check('cookie value is not readable by page scripts', !(await page.evaluate(() => document.cookie)).includes('__Host-s'));

    check('sign out', (await T('call', 'POST', '/api/logout')).status === 204 && (await T('call', 'GET', '/api/me')).status === 401);
    const inn = await T('signIn');
    check('usernameless sign-in', inn.status === 200 && inn.body.name === up.body?.name, JSON.stringify(inn));

    const replayBody = await T('assertion');
    const first = await T('call', 'POST', '/api/login/finish', replayBody);
    const replay = await T('call', 'POST', '/api/login/finish', replayBody);
    check('replayed sign-in is refused', first.status === 200 && replay.status === 400 && replay.body.error === 'failed', `${first.status}/${replay.status}`);

    const jar = (await ctx.cookies()).map(c => `${c.name}=${c.value}`).join('; ');
    const forged = await fetch(ORIGIN + '/api/logout-all', { method: 'POST', headers: { Cookie: jar, 'Content-Type': 'application/json', Origin: 'https://evil.example' }, body: '{}' });
    const formPost = await fetch(ORIGIN + '/api/logout-all', { method: 'POST', headers: { Cookie: jar, 'Content-Type': 'text/plain', Origin: ORIGIN }, body: '{}' });
    check('forged cross-site and non-JSON writes are refused', forged.status === 403 && formPost.status === 403, `${forged.status}/${formPost.status}`);
    check('still signed in after forged requests', (await T('call', 'GET', '/api/me')).status === 200);

    check('sign out everywhere', (await T('call', 'POST', '/api/logout-all')).status === 204 && (await T('call', 'GET', '/api/me')).status === 401);
    const rec = await T('call', 'POST', '/api/recover', { code: codes[0]?.toLowerCase() });
    me = await T('call', 'GET', '/api/me');
    check('recovery code signs in once', rec.status === 200 && me.body?.codesLeft === 9, JSON.stringify(rec));
    await T('call', 'POST', '/api/logout');
    const again = await T('call', 'POST', '/api/recover', { code: codes[0] });
    check('used recovery code is refused', again.status === 400, JSON.stringify(again));
    const tamper = await T('call', 'POST', '/api/recover', { code: codes[1], extra: true });
    check('unknown JSON fields are rejected', tamper.status === 400 && tamper.body.error === 'bad_request');

    // ---- cloud save ----
    await T('call', 'POST', '/api/recover', { code: codes[2] });
    const put = b => T('call', 'PUT', '/api/progress', b);
    let pr = await put({ stars: { ayodhya: 1, nepal: 2 } });
    pr = await put({ stars: { ayodhya: 3 } });
    pr = await put({ stars: { ayodhya: 1 } });
    check('best-score merge never lowers stars', pr.status === 200 && pr.body.stars.ayodhya === 3 && pr.body.stars.nepal === 2, JSON.stringify(pr));
    const bad1 = await put({ stars: { ayodhya: 99 } }), bad2 = await put({ stars: { atlantis: 1 } }), bad3 = await put({ stars: { ayodhya: 2.5 } });
    const after = await T('call', 'GET', '/api/progress');
    check('tampered progress is rejected and nothing changes', [bad1, bad2, bad3].every(b => b.status === 400) && after.body.stars.ayodhya === 3 && Object.keys(after.body.stars).length === 2, JSON.stringify(after));
    await page.goto(ORIGIN + '/?debug');
    await page.evaluate(PAGE_HELPERS);
    const allIds = await page.evaluate(() => window.DQ.LV.map(l => l.id));
    const full = await put({ stars: Object.fromEntries(allIds.map(id => [id, 3])) });
    check('server accepts every level id the game uses', full.status === 200 && Object.keys(full.body.stars).length === allIds.length, JSON.stringify(full));
    // ---- deletion ----
    const del0 = await T('call', 'POST', '/api/account/delete', {});
    const del = await T('call', 'POST', '/api/account/delete', { confirm: 'delete' });
    check('account deletion needs explicit confirmation', del0.status === 400 && del.status === 204, `${del0.status}/${del.status}`);
    check('deleted account is signed out', (await T('call', 'GET', '/api/me')).status === 401);
    const ghost = await T('signIn');
    check('deleted account cannot sign in with its old passkey', ghost.status === 400, JSON.stringify(ghost));
    const recGone = await T('call', 'POST', '/api/recover', { code: codes[3] });
    check('deleted account recovery codes are gone', recGone.status === 400);

    let limited = false;
    for (let i = 0; i < 12 && !limited; i++) limited = (await T('call', 'POST', '/api/recover', { code: 'AAAA-AAAA-AAAA-AAAA' })).status === 429;
    check('recovery attempts are rate limited', limited);
    check('no page errors', errors.length === 0, errors.join('; '));
    const leaked = logs.join('').match(/__Host-|127\.0\.0\.1|::1/);
    check('logs hold no cookies or client addresses', !leaked, leaked && leaked[0]);
  } finally {
    if (browser) await browser.close();
    srv.kill('SIGTERM');
  }
  const failed = results.filter(r => !r.ok).length;
  console.log(failed ? `\n${failed} check(s) failed` : `\nAll ${results.length} account checks passed.`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
