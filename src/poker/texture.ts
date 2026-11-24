// Flop textures: the handful of board families players study (ace-high,
// broadway, paired, monotone, connected, …) plus the facets that cut across
// them (suits, connectedness, height). Families are assigned in a fixed order
// so every flop lands in exactly one.

import { RANKS, rankOf, suitOf, type Card } from './cards';

export type Family = 'ace' | 'broadway' | 'kq' | 'connected' | 'middle' | 'low' | 'paired' | 'monotone';
export type Suits = 'rainbow' | 'twotone' | 'monotone';
export type Connect = 'connected' | 'semi' | 'disconnected';

export const FAMILIES: readonly Family[] = ['ace', 'broadway', 'kq', 'connected', 'middle', 'low', 'paired', 'monotone'];

export const FAMILY_NAME: Record<Family, string> = {
  ace: 'Ace-high',
  broadway: 'Broadway',
  kq: 'King / Queen-high',
  connected: 'Connected',
  middle: 'Middling',
  low: 'Low & dry',
  paired: 'Paired',
  monotone: 'Monotone',
};

export const FAMILY_BLURB: Record<Family, string> = {
  ace: 'An ace on board, unpaired, two suits at most: the raiser’s range smashes it',
  broadway: 'Two or more of T J Q K (no ace): strong for both ranges, many straight draws',
  kq: 'One king or queen with low cards: dry, good for the raiser',
  connected: 'Three cards within five ranks: straights possible, the caller catches up',
  middle: 'Jack-, ten- or nine-high and disconnected',
  low: 'Eight-high or lower, disconnected: misses both ranges',
  paired: 'A pair on board: few strong hands, small bets',
  monotone: 'All one suit: flushes made, everything else shrinks',
};

export const SUITS_NAME: Record<Suits, string> = { rainbow: 'Rainbow', twotone: 'Two-tone', monotone: 'Monotone' };

export interface Texture {
  family: Family;
  suits: Suits;
  connect: Connect;
  paired: boolean;
  trips: boolean;
  /** Highest rank 0..12. */
  high: number;
  /** Cards ten or higher. */
  broadways: number;
  /** 0..1, how many draws and made hands change on later streets. */
  wetness: number;
  /** Short tags for chips: "A-high", "Rainbow", "Connected". */
  tags: string[];
}

/** True if some 5-rank window (the ace also plays low) holds every rank in `ranks`. */
function fitsWindow(ranks: number[]): boolean {
  // Value 1..13 for 2..A, and 0 for a low ace; windows [lo, lo + 4].
  for (let lo = 0; lo <= 9; lo++) {
    if (ranks.every((r) => (r + 1 >= lo && r + 1 <= lo + 4) || (r === 12 && lo === 0))) return true;
  }
  return false;
}

export function classifyFlop(cards: readonly Card[]): Texture {
  const ranks = cards.map(rankOf).sort((a, b) => b - a);
  const suits = cards.map(suitOf);
  const nSuits = new Set(suits).size;
  const distinct = [...new Set(ranks)];
  const paired = distinct.length < 3;
  const trips = distinct.length === 1;
  const suitsKind: Suits = nSuits === 1 ? 'monotone' : nSuits === 2 ? 'twotone' : 'rainbow';
  const high = ranks[0]!;
  const broadways = ranks.filter((r) => r >= 8).length;

  let connect: Connect = 'disconnected';
  if (!paired && fitsWindow(distinct)) connect = 'connected';
  else {
    for (let i = 0; i < distinct.length; i++)
      for (let j = i + 1; j < distinct.length; j++) if (fitsWindow([distinct[i]!, distinct[j]!])) connect = 'semi';
  }

  let family: Family;
  if (paired) family = 'paired';
  else if (suitsKind === 'monotone') family = 'monotone';
  else if (high === 12) family = 'ace';
  else if (broadways >= 2) family = 'broadway';
  else if (connect === 'connected') family = 'connected';
  else if (high >= 10) family = 'kq';
  else if (high >= 7) family = 'middle';
  else family = 'low';

  const wetness = Math.min(1, (connect === 'connected' ? 0.5 : connect === 'semi' ? 0.25 : 0) + (suitsKind === 'monotone' ? 0.45 : suitsKind === 'twotone' ? 0.3 : 0) + (broadways >= 2 ? 0.15 : 0) - (paired ? 0.2 : 0));

  const tags: string[] = [];
  tags.push(trips ? 'Trips' : paired ? 'Paired' : `${RANKS[high]}-high`);
  tags.push(SUITS_NAME[suitsKind]);
  if (!paired) tags.push(connect === 'connected' ? 'Connected' : connect === 'semi' ? 'Semi-connected' : 'Disconnected');

  return { family, suits: suitsKind, connect, paired, trips, high, broadways, wetness: Math.max(0, wetness), tags };
}

/** How many of the 22,100 flops look like this one up to suit swaps (for weighting aggregates). */
export function flopWeight(cards: readonly Card[]): number {
  const ranks = cards.map(rankOf);
  const nSuits = new Set(cards.map(suitOf)).size;
  const distinctRanks = new Set(ranks).size;
  if (distinctRanks === 3) return nSuits === 1 ? 4 : nSuits === 2 ? 12 : 24;
  if (distinctRanks === 2) return 12; // pair + kicker: two-tone (kicker shares a suit) or rainbow, 12 each
  return 4; // trips
}
