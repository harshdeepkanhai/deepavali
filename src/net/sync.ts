import { createSignal } from 'solid-js';
import { save, persist } from '../core/save.js';
import { putStars } from './api';

// Guests never talk to the server. This hint (not a secret: the session cookie is HttpOnly)
// only tells the game that a signed-in session may exist on this device.
const HINT = 'deepa-quest-acct';
export const signedInHint = (): boolean => { try { return localStorage.getItem(HINT) === '1'; } catch { return false; } };
export const setHint = (on: boolean) => {
  try { if (on) localStorage.setItem(HINT, '1'); else localStorage.removeItem(HINT); } catch { /* private mode */ }
};

const [state, setState] = createSignal<'' | 'ok' | 'offline'>('');
export const syncState = state;

let listener: (() => void) | null = null;
/** Called when the account had more stars than this device, after they are saved locally. */
export const onStarsChanged = (fn: () => void) => { listener = fn; };

let timer: number | undefined;
let waitingForNetwork = false;

export function syncSoon() {
  if (!signedInHint()) return;
  clearTimeout(timer);
  timer = window.setTimeout(() => { void syncNow(); }, 400);
}

export async function syncNow(): Promise<void> {
  if (!signedInHint()) return;
  const local = save.stars as Record<string, number>;
  const stars: Record<string, number> = {};
  for (const [k, v] of Object.entries(local)) if (Number.isInteger(v) && v >= 0 && v <= 3) stars[k] = v;
  try {
    const merged = await putStars(stars);
    let changed = false;
    for (const [k, v] of Object.entries(merged)) if ((local[k] || 0) < v) { local[k] = v; changed = true; }
    if (changed) { persist(); listener?.(); }
    setState('ok');
  } catch (e: any) {
    if (e?.status === 401) { setHint(false); setState(''); return; }
    setState('offline');
    if (!waitingForNetwork) {
      waitingForNetwork = true;
      window.addEventListener('online', () => { waitingForNetwork = false; syncSoon(); }, { once: true });
    }
  }
}
