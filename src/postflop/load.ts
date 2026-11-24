// The solved flops, each its own lazily loaded chunk (src/data/postflop).

import { decodeFlop } from './decode';
import type { SolvedFlop, StoredFlop } from './types';

const files = import.meta.glob<StoredFlop>('../data/postflop/*/*.json', { import: 'default' });

const KEY_RE = /postflop\/([^/]+)\/([^/]+)\.json$/;

/** Which (spot, flop) pairs have a solution. */
export const SOLVED: ReadonlyArray<{ spot: string; flop: string; key: string }> = Object.keys(files)
  .map((key) => {
    const m = KEY_RE.exec(key);
    return m ? { spot: m[1]!, flop: m[2]!, key } : null;
  })
  .filter((x): x is { spot: string; flop: string; key: string } => x !== null);

export const solvedFlops = (spot: string): string[] => SOLVED.filter((s) => s.spot === spot).map((s) => s.flop);

const cache = new Map<string, Promise<SolvedFlop>>();

export function loadFlop(spot: string, flop: string): Promise<SolvedFlop> {
  const key = `${spot}/${flop}`;
  let p = cache.get(key);
  if (!p) {
    const entry = SOLVED.find((s) => s.spot === spot && s.flop === flop);
    if (!entry) return Promise.reject(new Error(`no solution for ${key}`));
    p = files[entry.key]!().then(decodeFlop);
    p.catch(() => cache.delete(key));
    cache.set(key, p);
  }
  return p;
}
