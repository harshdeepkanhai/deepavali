import { createSignal, For, Match, Show, Switch } from 'solid-js';
import { Icon } from './Icon';
import { tr } from './bridge';
import { setHint, signedInHint, syncNow, syncState } from '../net/sync';
import * as client from '../net/api';

type Me = { name: string; passkeys: number; codesLeft: number };

const [view, setView] = createSignal<'loading' | 'guest' | 'codes' | 'signed'>('loading');
const [me, setMe] = createSignal<Me | null>(null);
const [codes, setCodes] = createSignal<string[]>([]);
const [msgKey, setMsgKey] = createSignal('');
const [busy, setBusy] = createSignal(false);
const [confirmDelete, setConfirmDelete] = createSignal(false);
const [code, setCode] = createSignal('');
// Static import on purpose: dynamic import() would pull in bundler-specific helper code.
const api = async () => client;

/** Called by the legacy router each time the account screen is shown. */
export async function openAccount() {
  setMsgKey('');
  setConfirmDelete(false);
  if (!signedInHint()) { setView('guest'); return; }
  setView('loading');
  try {
    setMe(await (await api()).me());
    setView('signed');
  } catch (e: any) {
    if (e?.status === 401) setHint(false); else setMsgKey('acErr');
    setView('guest');
  }
}

// A cancelled passkey prompt is not an error worth showing.
const messageFor = (e: any) =>
  e?.name === 'NotAllowedError' || e?.name === 'AbortError' || e?.code === 'cancelled' ? '' : e?.status === 429 ? 'acSlow' : 'acErr';

async function run(fn: () => Promise<void>) {
  if (busy()) return;
  setBusy(true);
  setMsgKey('');
  try { await fn(); } catch (e) { setMsgKey(messageFor(e)); } finally { setBusy(false); }
}

async function signedIn() {
  setHint(true);
  setMe(await (await api()).me());
  setView('signed');
  await syncNow();
}

const create = () => run(async () => {
  const r = await (await api()).signUp();
  setHint(true);
  setCodes(r.codes);
  setMe({ name: r.name, passkeys: 1, codesLeft: r.codes.length });
  setView('codes');
  await syncNow();
});
const signIn = () => run(async () => { await (await api()).signIn(); await signedIn(); });
const recover = () => run(async () => { await (await api()).recover(code()); setCode(''); await signedIn(); });
const addKey = () => run(async () => { const a = await api(); await a.addPasskey(); setMe(await a.me()); setMsgKey('acAdded'); });
const signOut = (all: boolean) => run(async () => {
  await (await api()).logout(all);
  setHint(false); setMe(null); setView('guest');
});
const remove = () => run(async () => {
  await (await api()).deleteAccount();
  setHint(false); setMe(null); setConfirmDelete(false); setView('guest');
});
const copyCodes = async () => {
  try { await navigator.clipboard.writeText(codes().join('\n')); setMsgKey('copied'); } catch { setMsgKey('noCopy'); }
};

/** Account screen: create, sign in, recover, sign out, delete. Stars sync through net/sync. */
export function Account(props: { onBack(): void }) {
  const passkeys = typeof window.PublicKeyCredential === 'function';
  return (
    <>
      <div class="mhead">
        <button class="ib" id="acb" aria-label={tr('back')} onClick={props.onBack}><Icon name="back" /></button>
        <span class="mlogo"><Icon name="key" />{tr('acT')}</span>
      </div>
      <div class="mscroll">
        <div class="acct" aria-busy={busy()}>
          <Switch>
            <Match when={view() === 'guest'}>
              <p>{tr('acH')}</p>
              <Show when={passkeys} fallback={<p class="msg">{tr('acNo')}</p>}>
                <button class="btn pri" id="ac-new" disabled={busy()} onClick={create}><Icon name="key" />{tr('acNew')}</button>
                <button class="btn" id="ac-in" disabled={busy()} onClick={signIn}><Icon name="key" />{tr('acIn')}</button>
              </Show>
              <form class="stack" onSubmit={e => { e.preventDefault(); void recover(); }}>
                <label class="lbl2" for="ac-code">{tr('acRec')}</label>
                <input id="ac-code" class="inp" autocomplete="off" autocapitalize="characters" spellcheck={false} maxLength={24}
                  placeholder="XXXX-XXXX-XXXX-XXXX" value={code()} onInput={e => setCode(e.currentTarget.value)} />
                <button class="btn ghost" id="ac-rec" type="submit" disabled={busy() || code().replace(/[\s-]/g, '').length !== 16}>{tr('acGo')}</button>
              </form>
            </Match>
            <Match when={view() === 'codes'}>
              <h2 class="rt">{tr('acCodes')}</h2>
              <p>{tr('acCodesH')}</p>
              <ol class="codes" id="ac-codes"><For each={codes()}>{c => <li>{c}</li>}</For></ol>
              <button class="btn" onClick={copyCodes}><Icon name="book" />{tr('acCopy')}</button>
              <button class="btn pri" id="ac-saved" onClick={() => { setCodes([]); setView('signed'); }}><Icon name="check" />{tr('acSaved')}</button>
            </Match>
            <Match when={view() === 'signed'}>
              <p class="who2" id="ac-name">{tr('acHi', { n: me()?.name ?? '' })}</p>
              <p class="msg ok" id="ac-sync">{syncState() === 'offline' ? tr('acOff') : syncState() === 'ok' ? tr('acOk') : ''}</p>
              <p>{tr('acLeft', { n: me()?.codesLeft ?? 0 })}</p>
              <Show when={passkeys}>
                <button class="btn" id="ac-add" disabled={busy()} onClick={addKey}><Icon name="key" />{tr('acAdd')}</button>
              </Show>
              <button class="btn" id="ac-out" disabled={busy()} onClick={() => signOut(false)}>{tr('acOut')}</button>
              <button class="btn ghost" id="ac-outall" disabled={busy()} onClick={() => signOut(true)}>{tr('acOutAll')}</button>
              <Show when={confirmDelete()} fallback={<button class="btn ghost" id="ac-del" onClick={() => setConfirmDelete(true)}>{tr('acDel')}</button>}>
                <p class="msg">{tr('acDelQ')}</p>
                <div class="row">
                  <button class="btn" onClick={() => setConfirmDelete(false)}>{tr('cancel')}</button>
                  <button class="btn danger" id="ac-del-yes" disabled={busy()} onClick={remove}>{tr('erase')}</button>
                </div>
              </Show>
            </Match>
          </Switch>
          <p class="msg" role="status" id="ac-msg">{msgKey() ? tr(msgKey()) : ''}</p>
        </div>
      </div>
    </>
  );
}
