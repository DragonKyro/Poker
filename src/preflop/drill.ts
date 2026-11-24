// Dealing preflop drill hands: pick a spot from the set-up, then a hand the
// hero can actually hold there (weighted by how often it arrives), leaning
// on the interesting ones — mixed hands and the edges of the range — unless
// the set-up asks for the true mix or for past mistakes.

import type { Card } from '@/poker/cards';
import { CLASS_INDEX, HAND_CLASSES, combosOf, comboCount } from '@/poker/hands';
import type { Focus, PreflopSetup } from '@/store/prefsStore';
import { preflopSpots, preflopSpot } from './spots';
import type { PreflopSpot } from './types';

export interface PreflopDeal {
  spot: PreflopSpot;
  cls: string;
  cards: [Card, Card];
  /** 0..99 when the RNG is on. */
  roll?: number;
  edge: boolean;
}

/** Dominant action of each class (−1 when the class can't be here). */
function dominant(spot: PreflopSpot): Int8Array {
  const out = new Int8Array(169).fill(-1);
  for (let i = 0; i < 169; i++) {
    if (spot.reach[i]! <= 0.001) continue;
    let best = 0;
    for (let a = 1; a < spot.actions.length; a++) if (spot.strategy[a]![i]! > spot.strategy[best]![i]!) best = a;
    out[i] = best;
  }
  return out;
}

const edgeCache = new Map<string, Uint8Array>();

/** 1 for classes that mix or touch a cell (in the grid) that plays differently. */
export function edges(spot: PreflopSpot): Uint8Array {
  let e = edgeCache.get(spot.id);
  if (e) return e;
  const dom = dominant(spot);
  e = new Uint8Array(169);
  for (let i = 0; i < 169; i++) {
    if (dom[i] === -1) continue;
    const max = Math.max(...spot.strategy.map((s) => s[i]!));
    if (max < 0.95) {
      e[i] = 1;
      continue;
    }
    const r = Math.floor(i / 13);
    const c = i % 13;
    for (const [dr, dc] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ] as const) {
      const rr = r + dr;
      const cc = c + dc;
      if (rr < 0 || rr > 12 || cc < 0 || cc > 12) continue;
      const j = rr * 13 + cc;
      if (dom[j] !== -1 && dom[j] !== dom[i]) e[i] = 1;
    }
  }
  edgeCache.set(spot.id, e);
  return e;
}

export function matchingSpots(setup: PreflopSetup): PreflopSpot[] {
  return preflopSpots().filter((s) => s.format === setup.format && setup.types.includes(s.type) && (setup.heroes.length === 0 || setup.heroes.includes(s.hero)));
}

function pickWeighted<T>(items: readonly T[], weight: (t: T) => number, rand: () => number): T | undefined {
  let total = 0;
  for (const it of items) total += Math.max(0, weight(it));
  if (total <= 0) return undefined;
  let x = rand() * total;
  for (const it of items) {
    x -= Math.max(0, weight(it));
    if (x <= 0) return it;
  }
  return items[items.length - 1];
}

function classWeight(spot: PreflopSpot, i: number, focus: Focus): number {
  const base = spot.reach[i]! * comboCount(HAND_CLASSES[i]!);
  if (focus === 'all') return base;
  const edge = edges(spot)[i] === 1;
  if (focus === 'edges') return edge ? base : 0;
  // smart: edges at full weight, everything else a little
  return edge ? base : base * 0.12;
}

/** A specific two-card combo of a class, with random suits. */
export function comboFor(cls: string, rand: () => number): [Card, Card] {
  const combos = combosOf(cls);
  const c = combos[Math.floor(rand() * combos.length)]!;
  return c;
}

/**
 * Deal one drill hand. `misses` are 'pf:<spot id>|<class>' review keys
 * (newest first) for focus 'review'.
 */
export function dealPreflop(setup: PreflopSetup, opts: { rng: boolean; misses?: readonly string[]; avoid?: string; rand?: () => number }): PreflopDeal | null {
  const rand = opts.rand ?? Math.random;
  const spots = matchingSpots(setup);
  if (spots.length === 0) return null;

  if (setup.focus === 'review' && opts.misses?.length) {
    const ok = new Set(spots.map((s) => s.id));
    const pool = opts.misses.map((k) => k.slice(3).split('|') as [string, string]).filter(([id]) => ok.has(id));
    if (pool.length) {
      const [id, cls] = pool[Math.floor(rand() * Math.min(pool.length, 30))]!;
      const spot = preflopSpot(id)!;
      return finish(spot, cls, opts.rng, rand);
    }
  }

  for (let tries = 0; tries < 20; tries++) {
    const spot = spots[Math.floor(rand() * spots.length)]!;
    const i = pickWeighted(
      Array.from({ length: 169 }, (_, k) => k),
      (k) => classWeight(spot, k, setup.focus === 'review' ? 'smart' : setup.focus),
      rand,
    );
    if (i === undefined) continue;
    const cls = HAND_CLASSES[i]!;
    if (`${spot.id}|${cls}` === opts.avoid && tries < 19) continue;
    return finish(spot, cls, opts.rng, rand);
  }
  return null;
}

function finish(spot: PreflopSpot, cls: string, rng: boolean, rand: () => number): PreflopDeal {
  const i = CLASS_INDEX.get(cls)!;
  return { spot, cls, cards: comboFor(cls, rand), roll: rng ? Math.floor(rand() * 100) : undefined, edge: edges(spot)[i] === 1 };
}
