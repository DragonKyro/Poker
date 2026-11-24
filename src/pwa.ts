// Offline: the service worker (vite-plugin-pwa / Workbox) precaches the app,
// the charts and the solved flops, so after the first visit it opens and
// drills with no connection.
//
// Updates: a new build downloads in the background; once installed the page
// reloads to use it — at once outside the drills, else at the next navigation
// (never in the middle of a hand).

import { registerSW } from 'virtual:pwa-register';

const inDrill = () => /^#\/(preflop|postflop)/.test(window.location.hash);

function reloadWhenIdle(): void {
  if (!inDrill()) {
    window.location.reload();
    return;
  }
  const onNav = () => {
    window.removeEventListener('hashchange', onNav);
    window.location.reload();
  };
  window.addEventListener('hashchange', onNav);
}

export function registerOffline(): void {
  if (import.meta.env.DEV || !('serviceWorker' in navigator)) return;
  registerSW({ immediate: true, onNeedReload: reloadWhenIdle });
}
