// Starting hands: the 1326 two-card combos and the 169 hand classes
// ('AA', 'AKs', 'AKo') laid out on the usual 13 × 13 grid — pairs on the
// diagonal, suited above it, offsuit below, aces in the top-left corner.

import { RANKS, makeCard, rankOf, suitOf, type Card } from './cards';

export type HandClass = string;

/** Combo index of two distinct cards: hi*(hi-1)/2 + lo, 0..1325. */
export function comboIndex(a: Card, b: Card): number {
  const hi = a > b ? a : b;
  const lo = a > b ? b : a;
  return (hi * (hi - 1)) / 2 + lo;
}

export const NUM_COMBOS = 1326;

/** The two cards of each combo (higher card first). */
export const COMBO_CARDS: ReadonlyArray<readonly [Card, Card]> = (() => {
  const out: Array<[Card, Card]> = new Array(NUM_COMBOS);
  for (let hi = 1; hi < 52; hi++) for (let lo = 0; lo < hi; lo++) out[comboIndex(hi, lo)] = [hi, lo];
  return out;
})();

/** Hand class of two cards. */
export function classOf(a: Card, b: Card): HandClass {
  const ra = rankOf(a);
  const rb = rankOf(b);
  const hi = Math.max(ra, rb);
  const lo = Math.min(ra, rb);
  if (hi === lo) return RANKS[hi]! + RANKS[lo]!;
  return RANKS[hi]! + RANKS[lo]! + (suitOf(a) === suitOf(b) ? 's' : 'o');
}

/** Grid cell (row, col), ranks descending: row 0 / col 0 is the ace. */
export function classAt(row: number, col: number): HandClass {
  const r1 = 12 - row;
  const r2 = 12 - col;
  if (row === col) return RANKS[r1]! + RANKS[r1]!;
  if (row < col) return RANKS[r1]! + RANKS[r2]! + 's';
  return RANKS[r2]! + RANKS[r1]! + 'o';
}

/** All 169 classes in grid order (row-major). */
export const HAND_CLASSES: readonly HandClass[] = Array.from({ length: 169 }, (_, i) => classAt(Math.floor(i / 13), i % 13));
export const CLASS_INDEX: ReadonlyMap<HandClass, number> = new Map(HAND_CLASSES.map((h, i) => [h, i]));

export const isPair = (h: HandClass) => h.length === 2;
export const isSuited = (h: HandClass) => h[2] === 's';
export const comboCount = (h: HandClass) => (isPair(h) ? 6 : isSuited(h) ? 4 : 12);

/** The concrete combos of a class, as card pairs (higher rank first). */
export function combosOf(h: HandClass): Array<[Card, Card]> {
  const r1 = RANKS.indexOf(h[0]!);
  const r2 = RANKS.indexOf(h[1]!);
  const out: Array<[Card, Card]> = [];
  if (r1 === r2) {
    for (let s1 = 0; s1 < 4; s1++) for (let s2 = s1 + 1; s2 < 4; s2++) out.push([makeCard(r1, s2), makeCard(r1, s1)]);
  } else if (h[2] === 's') {
    for (let s = 3; s >= 0; s--) out.push([makeCard(r1, s), makeCard(r2, s)]);
  } else {
    for (let s1 = 3; s1 >= 0; s1--) for (let s2 = 3; s2 >= 0; s2--) if (s1 !== s2) out.push([makeCard(r1, s1), makeCard(r2, s2)]);
  }
  return out;
}

/** Class index (0..168) of each combo. */
export const COMBO_CLASS: Uint8Array = (() => {
  const out = new Uint8Array(NUM_COMBOS);
  for (let i = 0; i < NUM_COMBOS; i++) {
    const [a, b] = COMBO_CARDS[i]!;
    out[i] = CLASS_INDEX.get(classOf(a, b))!;
  }
  return out;
})();
