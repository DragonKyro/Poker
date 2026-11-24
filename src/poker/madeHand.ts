// What a hand has on a board, the way a player would say it: "Top pair, good
// kicker + flush draw", "Set", "Gutshot". Buckets group hands for the strategy
// breakdowns (how a range plays its overpairs, its draws, its air).

import { rankOf, suitOf, type Card, RANKS } from './cards';
import { Cat, categoryOf, evaluate } from './eval';

export type Bucket = 'strong' | 'overpair' | 'toppair' | 'midpair' | 'weakpair' | 'draw' | 'weakdraw' | 'acehigh' | 'air';

export const BUCKETS: readonly Bucket[] = ['strong', 'overpair', 'toppair', 'midpair', 'weakpair', 'draw', 'weakdraw', 'acehigh', 'air'];

export const BUCKET_NAME: Record<Bucket, string> = {
  strong: 'Two pair or better',
  overpair: 'Overpair',
  toppair: 'Top pair',
  midpair: 'Middle pair',
  weakpair: 'Weak pair',
  draw: 'Strong draw',
  weakdraw: 'Weak draw',
  acehigh: 'Ace high',
  air: 'Nothing',
};

export interface HandInfo {
  bucket: Bucket;
  /** "Top pair, good kicker", "Set", "Ace high". */
  made: string;
  /** "Flush draw", "Open-ender", "Gutshot", "Backdoor flush". */
  draws: string[];
  label: string;
}

const STRAIGHT_MASKS: number[] = (() => {
  const out: number[] = [];
  for (let top = 12; top >= 4; top--) out.push(0x1f << (top - 4));
  out.push(0x100f); // wheel
  return out;
})();

const hasStraight = (mask: number) => STRAIGHT_MASKS.some((m) => (mask & m) === m);

/** Ranks that would complete a straight using at least one hole card. */
function straightOuts(hole: readonly Card[], board: readonly Card[]): number {
  const boardMask = board.reduce((m, c) => m | (1 << rankOf(c)), 0);
  const allMask = hole.reduce((m, c) => m | (1 << rankOf(c)), boardMask);
  let outs = 0;
  for (let r = 0; r < 13; r++) {
    if (allMask & (1 << r)) continue;
    const withR = allMask | (1 << r);
    // must use a hole card: the straight isn't there with the board alone plus r
    if (hasStraight(withR) && !hasStraight(boardMask | (1 << r))) outs++;
  }
  return outs;
}

export function describeHand(hole: readonly [Card, Card] | readonly Card[], board: readonly Card[]): HandInfo {
  const all = [...hole, ...board];
  const strength = evaluate(all);
  const cat = categoryOf(strength);
  const boardRanks = [...new Set(board.map(rankOf))].sort((a, b) => b - a);
  const top = boardRanks[0]!;
  const [h1, h2] = [rankOf(hole[0]!), rankOf(hole[1]!)];
  const pocket = h1 === h2;

  let made: string;
  let bucket: Bucket;
  const pairedWith = [h1, h2].filter((r) => boardRanks.includes(r));

  if (cat >= Cat.Straight) {
    made = cat === Cat.StraightFlush ? 'Straight flush' : cat === Cat.Quads ? 'Quads' : cat === Cat.FullHouse ? 'Full house' : cat === Cat.Flush ? 'Flush' : 'Straight';
    bucket = 'strong';
  } else if (cat === Cat.Trips) {
    made = pocket && boardRanks.includes(h1) ? 'Set' : 'Trips';
    bucket = 'strong';
  } else if (cat === Cat.TwoPair && pairedWith.length === 2 && !pocket) {
    made = 'Two pair';
    bucket = 'strong';
  } else if (pocket && !boardRanks.includes(h1)) {
    if (h1 > top) {
      made = 'Overpair';
      bucket = 'overpair';
    } else if (h1 > (boardRanks[1] ?? -1)) {
      made = 'Pocket pair below top';
      bucket = 'midpair';
    } else {
      made = 'Underpair';
      bucket = 'weakpair';
    }
  } else if (pairedWith.length > 0) {
    const r = Math.max(...pairedWith);
    const idx = boardRanks.indexOf(r);
    const kicker = r === h1 ? h2 : h1;
    if (idx === 0) {
      const best = [12, 11, 10, 9].find((k) => k !== r && !boardRanks.includes(k)) ?? 9;
      const good = kicker >= best - 1 || kicker >= 9;
      made = kicker === best ? 'Top pair, top kicker' : good ? 'Top pair, good kicker' : 'Top pair, weak kicker';
      bucket = 'toppair';
    } else if (idx === 1) {
      made = 'Middle pair';
      bucket = 'midpair';
    } else {
      made = 'Bottom pair';
      bucket = 'weakpair';
    }
  } else if (h1 === 12 || h2 === 12) {
    made = 'Ace high';
    bucket = 'acehigh';
  } else {
    made = `${RANKS[Math.max(h1, h2)]} high`;
    bucket = 'air';
  }

  const draws: string[] = [];
  if (board.length < 5 && cat < Cat.Flush) {
    const suitCount = [0, 0, 0, 0];
    for (const c of all) suitCount[suitOf(c)]!++;
    const holeSuits = new Set(hole.map(suitOf));
    const fd = [...holeSuits].some((s) => suitCount[s] === 4);
    const bdfd = board.length === 3 && !fd && [...holeSuits].some((s) => suitCount[s] === 3);
    if (fd) draws.push('Flush draw');
    if (cat < Cat.Straight) {
      const outs = straightOuts(hole, board);
      if (outs >= 2) draws.push('Open-ender');
      else if (outs === 1) draws.push('Gutshot');
    }
    if (bdfd) draws.push('Backdoor flush');
    const strongDraw = fd || draws.includes('Open-ender');
    if (bucket === 'acehigh' || bucket === 'air') {
      if (strongDraw) bucket = 'draw';
      else if (draws.includes('Gutshot')) bucket = 'weakdraw';
    }
  }
  const label = draws.length ? `${made} + ${draws.filter((d) => d !== 'Backdoor flush' || draws.length === 1).join(' + ')}` : made;
  return { bucket, made, draws, label };
}
