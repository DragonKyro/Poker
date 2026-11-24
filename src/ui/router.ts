// Hash routes, so the phone's back button walks back through the app and
// GitHub Pages needs no rewrites:
//   #/  #/preflop  #/postflop  #/charts/6max/vsRFI/BB/BTN  #/boards/srp-btn-bb/As7d2c  #/stats

import { useSyncExternalStore } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'preflop' }
  | { name: 'postflop' }
  | { name: 'charts'; spot: string | null }
  | { name: 'boards'; spot: string | null; flop: string | null }
  | { name: 'stats' };

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  switch (parts[0]) {
    case 'preflop':
      return { name: 'preflop' };
    case 'postflop':
      return { name: 'postflop' };
    case 'charts':
      return { name: 'charts', spot: parts.length > 1 ? parts.slice(1).join('/') : null };
    case 'boards':
      return { name: 'boards', spot: parts[1] ?? null, flop: parts[2] ?? null };
    case 'stats':
      return { name: 'stats' };
    default:
      return { name: 'home' };
  }
}

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  return parseHash(hash);
}

export const paths = {
  home: '#/',
  preflop: '#/preflop',
  postflop: '#/postflop',
  charts: (spot?: string) => (spot ? `#/charts/${spot}` : '#/charts'),
  boards: (spot?: string, flop?: string) => (spot ? (flop ? `#/boards/${spot}/${flop}` : `#/boards/${spot}`) : '#/boards'),
  stats: '#/stats',
};

/** Pages pushed by go() this visit, so an in-app "back" knows whether history.back() stays in the app. */
let pushed = 0;

/** Navigate; `replace` swaps the current history entry (no extra back step). */
export function go(path: string, replace = false): void {
  if (replace) {
    window.location.replace(path);
  } else {
    pushed++;
    window.location.hash = path.slice(1);
  }
}

/** Back through history when we got here within the app, else straight to `fallback`. */
export function back(fallback: string): void {
  if (pushed > 0) {
    pushed--;
    window.history.back();
  } else {
    go(fallback, true);
  }
}
