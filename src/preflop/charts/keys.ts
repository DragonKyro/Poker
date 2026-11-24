// Which charts each book must contain.

import { SEATS, type Position } from '@/poker/positions';

const EP9: readonly Position[] = ['UTG', 'UTG1', 'UTG2'];

/** Every [opener, later seat] pair of a seat list (BB never opens). */
function pairs(seats: readonly Position[]): Array<[Position, Position]> {
  const out: Array<[Position, Position]> = [];
  for (let i = 0; i < seats.length - 1; i++) for (let j = i + 1; j < seats.length; j++) out.push([seats[i]!, seats[j]!]);
  return out;
}

function keysFor(openers: readonly Position[], seats: readonly Position[]): string[] {
  const keys: string[] = openers.filter((p) => p !== 'BB').map((p) => `RFI/${p}`);
  for (const [open, later] of pairs(seats)) {
    if (!openers.includes(open)) continue;
    keys.push(`vsRFI/${later}/${open}`, `vs3B/${open}/${later}`, `vs4B/${later}/${open}`);
  }
  return keys;
}

/** 6-max: all 50 charts. */
export const SIX_MAX_KEYS: readonly string[] = keysFor(SEATS['6max'], SEATS['6max']);

/** 9-max: only the spots with an early-position opener (the rest map onto 6-max). */
export const NINE_MAX_KEYS: readonly string[] = keysFor(EP9, SEATS['9max']);
