import { createSignal } from 'solid-js';
import { t } from '../core/i18n.js';

/*
 * Temporary bridge between legacy code and Solid (design.md, decision 3).
 * `save` is still a plain object, so Solid cannot see it change. Legacy code calls
 * refreshUI() after changing settings or language; components read ui() (directly or
 * through tr()) so their expressions re-run. Deleted once `save` becomes a Solid store.
 */
const [version, setVersion] = createSignal(0);

/** Track legacy state: read this inside a reactive expression. */
export const ui = version;

/** Notify components that `save` or the UI language changed. */
export const refreshUI = () => setVersion(v => v + 1);

/** Reactive translate: like t(), but re-evaluates after refreshUI(). */
export const tr = (key: string, vars?: Record<string, string | number>): string => (ui(), t(key, vars));
