// Hand strength: the best five of up to seven cards, as one integer that
// compares correctly (bigger wins, equal ties). Category in the top bits,
// then up to five rank nibbles. Fast enough for the solver's precompute
// (every combo on every runout of a flop, ~1.5M evaluations).

import { rankOf, suitOf, type Card } from './cards';

export const Cat = { High: 0, Pair: 1, TwoPair: 2, Trips: 3, Straight: 4, Flush: 5, FullHouse: 6, Quads: 7, StraightFlush: 8 } as const;
export type Cat = (typeof Cat)[keyof typeof Cat];

const SHIFT = 20;

/** Top card of the highest straight in a 13-bit rank mask, or -1. */
function straightTop(mask: number): number {
  for (let top = 12; top >= 4; top--) {
    const need = 0x1f << (top - 4);
    if ((mask & need) === need) return top;
  }
  // wheel: A-2-3-4-5
  if ((mask & 0x100f) === 0x100f) return 3;
  return -1;
}

/** The `n` highest set bits of a rank mask, packed as nibbles (highest first). */
function topRanks(mask: number, n: number): number {
  let v = 0;
  let got = 0;
  for (let r = 12; r >= 0 && got < n; r--) {
    if (mask & (1 << r)) {
      v = (v << 4) | r;
      got++;
    }
  }
  return v << (4 * (5 - got));
}

const counts = new Int8Array(13);
const suitMasks = new Int32Array(4);
const suitCounts = new Int8Array(4);

/** Strength of the best 5-card hand among `n` cards (5..7). */
export function evaluate(cards: ArrayLike<Card>, n = cards.length): number {
  counts.fill(0);
  suitMasks.fill(0);
  suitCounts.fill(0);
  let mask = 0;
  for (let i = 0; i < n; i++) {
    const c = cards[i]!;
    const r = rankOf(c);
    const s = suitOf(c);
    counts[r]!++;
    suitMasks[s]! |= 1 << r;
    suitCounts[s]!++;
    mask |= 1 << r;
  }
  let flushSuit = -1;
  for (let s = 0; s < 4; s++) if (suitCounts[s]! >= 5) flushSuit = s;
  if (flushSuit >= 0) {
    const sf = straightTop(suitMasks[flushSuit]!);
    if (sf >= 0) return (Cat.StraightFlush << SHIFT) | (sf << 16);
  }
  let quad = -1;
  let trip1 = -1;
  let trip2 = -1;
  let pair1 = -1;
  let pair2 = -1;
  let pair3 = -1;
  for (let r = 12; r >= 0; r--) {
    const k = counts[r]!;
    if (k === 4) quad = r;
    else if (k === 3) {
      if (trip1 < 0) trip1 = r;
      else trip2 = r;
    } else if (k === 2) {
      if (pair1 < 0) pair1 = r;
      else if (pair2 < 0) pair2 = r;
      else pair3 = r;
    }
  }
  void pair3;
  if (quad >= 0) {
    return (Cat.Quads << SHIFT) | (quad << 16) | (topRanks(mask & ~(1 << quad), 1) >> 4);
  }
  if (trip1 >= 0 && (trip2 >= 0 || pair1 >= 0)) {
    const pr = Math.max(trip2, pair1);
    return (Cat.FullHouse << SHIFT) | (trip1 << 16) | (pr << 12);
  }
  if (flushSuit >= 0) return (Cat.Flush << SHIFT) | topRanks(suitMasks[flushSuit]!, 5);
  const st = straightTop(mask);
  if (st >= 0) return (Cat.Straight << SHIFT) | (st << 16);
  if (trip1 >= 0) {
    return (Cat.Trips << SHIFT) | (trip1 << 16) | (topRanks(mask & ~(1 << trip1), 2) >> 4);
  }
  if (pair2 >= 0) {
    const rest = mask & ~(1 << pair1) & ~(1 << pair2);
    return (Cat.TwoPair << SHIFT) | (pair1 << 16) | (pair2 << 12) | (topRanks(rest, 1) >> 8);
  }
  if (pair1 >= 0) {
    return (Cat.Pair << SHIFT) | (pair1 << 16) | (topRanks(mask & ~(1 << pair1), 3) >> 4);
  }
  return (Cat.High << SHIFT) | topRanks(mask, 5);
}

export const categoryOf = (strength: number): Cat => (strength >> SHIFT) as Cat;
