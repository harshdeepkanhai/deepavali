import './styles.css';
import { render } from 'solid-js/web';
import { mountIcons } from './core/icons.js';
import { boot, goMap, newVersionReady, titleActions } from './legacy/screens.js';
import { Title } from './ui/Title';
import { Account } from './ui/Account';

mountIcons();
// Screens migrated to Solid are mounted once; legacy go*() functions just show their section.
render(() => <Title {...titleActions} />, document.getElementById('s-title')!);
render(() => <Account onBack={goMap} />, document.getElementById('s-account')!);
boot();

// Offline play and instant repeat loads (production builds only; see pwa/sw.js).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const sw = navigator.serviceWorker;
  // This page came from the device; another worker taking over means a new version is ready.
  // (On a first visit the page came from the network and is already the newest.)
  if (sw.controller) sw.addEventListener('controllerchange', newVersionReady, { once: true });
  addEventListener('load', () => {
    sw.register('./sw.js').catch(() => { /* the game works without it */ });
  });
}
