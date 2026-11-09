// Account API client. Loaded only when a player opens the account screen or is signed in.
export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string) {
    super(code);
  }
}

type Json = Record<string, any>;

const dec = (s: string): ArrayBuffer => {
  const t = s.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(t + '='.repeat((4 - (t.length % 4)) % 4)), c => c.charCodeAt(0)).buffer;
};
const enc = (b: ArrayBuffer): string => {
  let s = '';
  new Uint8Array(b).forEach(x => { s += String.fromCharCode(x); });
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

async function call<T>(method: 'GET' | 'POST' | 'PUT', url: string, body?: unknown): Promise<T> {
  const init: RequestInit = method === 'GET'
    ? { credentials: 'same-origin' }
    : { method, credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) };
  const r = await fetch(url, init);
  if (!r.ok) {
    let code = 'error';
    try { code = (await r.json()).error; } catch { /* not JSON */ }
    throw new ApiError(r.status, code);
  }
  return (r.status === 204 ? undefined : await r.json()) as T;
}

function creationOptions(o: Json): PublicKeyCredentialCreationOptions {
  o.challenge = dec(o.challenge);
  o.user.id = dec(o.user.id);
  (o.excludeCredentials || []).forEach((c: Json) => { c.id = dec(c.id); });
  return o as PublicKeyCredentialCreationOptions;
}

function requestOptions(o: Json): PublicKeyCredentialRequestOptions {
  o.challenge = dec(o.challenge);
  (o.allowCredentials || []).forEach((c: Json) => { c.id = dec(c.id); });
  return o as PublicKeyCredentialRequestOptions;
}

function base(c: PublicKeyCredential): Json {
  return { id: c.id, rawId: enc(c.rawId), type: c.type, authenticatorAttachment: c.authenticatorAttachment, clientExtensionResults: c.getClientExtensionResults() };
}

async function newPasskey<T>(begin: string, finish: string): Promise<T> {
  const b = await call<Json>('POST', begin);
  const c = (await navigator.credentials.create({ publicKey: creationOptions(b.publicKey) })) as PublicKeyCredential | null;
  if (!c) throw new ApiError(0, 'cancelled');
  const r = c.response as AuthenticatorAttestationResponse;
  return call<T>('POST', finish, { ...base(c), response: {
    clientDataJSON: enc(r.clientDataJSON), attestationObject: enc(r.attestationObject),
    transports: typeof r.getTransports === 'function' ? r.getTransports() : [] } });
}

export const signUp = () => newPasskey<{ name: string; codes: string[] }>('/api/register/begin', '/api/register/finish');
export const addPasskey = () => newPasskey<void>('/api/passkeys/begin', '/api/passkeys/finish');

export async function signIn(): Promise<{ name: string }> {
  const b = await call<Json>('POST', '/api/login/begin');
  const c = (await navigator.credentials.get({ publicKey: requestOptions(b.publicKey) })) as PublicKeyCredential | null;
  if (!c) throw new ApiError(0, 'cancelled');
  const r = c.response as AuthenticatorAssertionResponse;
  return call('POST', '/api/login/finish', { ...base(c), response: {
    clientDataJSON: enc(r.clientDataJSON), authenticatorData: enc(r.authenticatorData),
    signature: enc(r.signature), userHandle: r.userHandle ? enc(r.userHandle) : null } });
}

export const recover = (code: string) => call<{ name: string }>('POST', '/api/recover', { code });
export const me = () => call<{ name: string; passkeys: number; codesLeft: number }>('GET', '/api/me');
export const logout = (all = false) => call<void>('POST', all ? '/api/logout-all' : '/api/logout');
export const deleteAccount = () => call<void>('POST', '/api/account/delete', { confirm: 'delete' });
export const putStars = (stars: Record<string, number>) =>
  call<{ stars: Record<string, number> }>('PUT', '/api/progress', { stars }).then(r => r.stars);
