// The postflop spots: who is in the pot, with which ranges (taken from the
// preflop charts, so the two halves of the trainer agree), the pot, the
// stacks, and the bet sizes the solver may use on each street.

import { COMBO_CLASS, NUM_COMBOS } from '@/poker/hands';
import type { Position } from '@/poker/positions';
import { preflopSpot } from '@/preflop/spots';
import type { StreetConfig, TreeConfig } from '@/solver/tree';

export interface PostflopSpot {
  id: string;
  name: string;
  /** "Single-raised pot" / "3-bet pot". */
  pot: 'srp' | '3bp';
  oop: Position;
  ip: Position;
  /** Who made the last preflop raise: 0 OOP, 1 IP. */
  pfr: 0 | 1;
  blurb: string;
  tree: TreeConfig;
}

/** Combo weights (1326) of each player's range. */
export function spotRanges(s: PostflopSpot): [Float32Array, Float32Array] {
  const f = '6max';
  const cls = (id: string, action: number, reachToo = false): Float32Array => {
    const sp = preflopSpot(`${f}/${id}`);
    if (!sp) throw new Error(`no preflop spot ${id}`);
    const out = new Float32Array(169);
    for (let i = 0; i < 169; i++) out[i] = sp.strategy[action]![i]! * (reachToo ? sp.reach[i]! : 1);
    return out;
  };
  let oop: Float32Array;
  let ip: Float32Array;
  if (s.pot === 'srp') {
    // PFR opened (RFI raise), the other called (vsRFI call).
    const opener = s.pfr === 1 ? s.ip : s.oop;
    const caller = s.pfr === 1 ? s.oop : s.ip;
    const open = cls(`RFI/${opener}`, 1);
    const call = cls(`vsRFI/${caller}/${opener}`, 1);
    [oop, ip] = s.pfr === 1 ? [call, open] : [open, call];
  } else {
    // 3-bet pot: the 3-bettor (PFR) 3-bet, the opener called the 3-bet.
    const threeBettor = s.pfr === 0 ? s.oop : s.ip;
    const opener = s.pfr === 0 ? s.ip : s.oop;
    const tb = cls(`vsRFI/${threeBettor}/${opener}`, 2);
    const call = cls(`vs3B/${opener}/${threeBettor}`, 1, true);
    [oop, ip] = s.pfr === 0 ? [tb, call] : [call, tb];
  }
  const combos = (c: Float32Array) => {
    const out = new Float32Array(NUM_COMBOS);
    for (let i = 0; i < NUM_COMBOS; i++) out[i] = c[COMBO_CLASS[i]!]!;
    return out;
  };
  return [combos(oop), combos(ip)];
}

const turnRiver = (bet: number): StreetConfig => ({ oopBet: [bet], ipBet: [bet], oopRaise: [], ipRaise: [], allin: false, raiseCap: 1 });
const river: StreetConfig = { oopBet: [0.75], ipBet: [0.75], oopRaise: [], ipRaise: [], allin: false, raiseCap: 0 };

/** In-position raiser: OOP checks to them, they bet 33% or 75%, OOP may check-raise. */
const ipPfrTree = (pot: number, stack: number): TreeConfig => ({
  pot,
  stack,
  allinThreshold: 0.67,
  streets: [{ oopBet: [], ipBet: [0.33, 0.75], oopRaise: [0.6], ipRaise: [0.6], allin: false, raiseCap: 2 }, turnRiver(0.66), river],
});

/** Out-of-position raiser: they bet 33% or 75% or check; IP may stab 50% or raise. */
const oopPfrTree = (pot: number, stack: number): TreeConfig => ({
  pot,
  stack,
  allinThreshold: 0.67,
  streets: [{ oopBet: [0.33, 0.75], ipBet: [0.5], oopRaise: [0.6], ipRaise: [0.6], allin: false, raiseCap: 2 }, turnRiver(0.66), river],
});

export const POSTFLOP_SPOTS: readonly PostflopSpot[] = [
  {
    id: 'srp-btn-bb',
    name: 'BTN vs BB',
    pot: 'srp',
    oop: 'BB',
    ip: 'BTN',
    pfr: 1,
    blurb: 'Button opens, big blind calls. The most common pot in 6-max.',
    tree: ipPfrTree(5.5, 97.5),
  },
  {
    id: 'srp-co-bb',
    name: 'CO vs BB',
    pot: 'srp',
    oop: 'BB',
    ip: 'CO',
    pfr: 1,
    blurb: 'Cutoff opens, big blind calls: a tighter range against a tighter defence.',
    tree: ipPfrTree(5.5, 97.5),
  },
  {
    id: 'srp-utg-bb',
    name: 'UTG vs BB',
    pot: 'srp',
    oop: 'BB',
    ip: 'UTG',
    pfr: 1,
    blurb: 'Under the gun opens, big blind calls: a strong range with a big range advantage on high boards.',
    tree: ipPfrTree(5.5, 97.5),
  },
  {
    id: 'srp-sb-bb',
    name: 'SB vs BB',
    pot: 'srp',
    oop: 'SB',
    ip: 'BB',
    pfr: 0,
    blurb: 'Small blind opens 3bb, big blind calls: the raiser is out of position.',
    tree: oopPfrTree(6, 97),
  },
  {
    id: '3bp-bb-btn',
    name: 'BB vs BTN 3-bet',
    pot: '3bp',
    oop: 'BB',
    ip: 'BTN',
    pfr: 0,
    blurb: 'Button opens, big blind 3-bets to 11, button calls. SPR about 4.',
    tree: oopPfrTree(22.5, 89),
  },
];

export const postflopSpot = (id: string) => POSTFLOP_SPOTS.find((s) => s.id === id);

export type NodeKind = 'cbet' | 'vsCbet' | 'vsRaise' | 'stab' | 'vsStab' | 'other';

export const NODE_KIND_NAME: Record<NodeKind, string> = {
  cbet: 'C-bet',
  vsCbet: 'Facing a c-bet',
  vsRaise: 'Facing a raise',
  stab: 'Checked to',
  vsStab: 'Facing a stab',
  other: 'Other',
};

/** What kind of flop decision a node path is, for the raiser `pfr`. */
export function nodeKind(path: string, actor: 0 | 1, pfr: 0 | 1): NodeKind {
  const ids = path ? path.split('-') : [];
  const bets = ids.filter((x) => x.startsWith('b') || x.startsWith('r') || x === 'a').length;
  if (bets === 0) return actor === pfr ? 'cbet' : 'stab';
  if (bets === 1) {
    // the one bet was made by…
    const bettorIsPfr = actor !== pfr;
    return bettorIsPfr ? 'vsCbet' : 'vsStab';
  }
  return actor === pfr && bets === 2 ? 'vsRaise' : 'other';
}
