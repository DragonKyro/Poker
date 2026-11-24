// Every preflop decision of both formats, built from the charts: what
// happened before the hero, the pot, the hero's options with their sizes,
// and the strategy per hand class. 9-max spots that involve none of
// UTG / UTG+1 / UTG+2 are the 6-max charts with LJ in UTG's place — the same
// number of players left to act behind.

import { HAND_CLASSES, CLASS_INDEX } from '@/poker/hands';
import { SEATS, STACK_BB, type Format, type Position } from '@/poker/positions';
import { parseRange } from '@/poker/range';
import { NINE_MAX } from './charts/nineMax';
import { SIX_MAX } from './charts/sixMax';
import type { ChartSource, PfAction, PreflopSpot, PriorAction, SpotType } from './types';

export const SPOT_TYPES: readonly SpotType[] = ['RFI', 'vsRFI', 'vs3B', 'vs4B'];

export const SPOT_TYPE_NAME: Record<SpotType, string> = {
  RFI: 'Open raise',
  vsRFI: 'Facing an open',
  vs3B: 'Facing a 3-bet',
  vs4B: 'Facing a 4-bet',
};

export const SPOT_TYPE_BLURB: Record<SpotType, string> = {
  RFI: 'Folded to you: open or fold',
  vsRFI: 'Someone opened: fold, call or 3-bet',
  vs3B: 'You opened and got 3-bet: fold, call or 4-bet',
  vs4B: 'You 3-bet and got 4-bet: fold, call or jam',
};

// ------------------------------------------------------------ sizes

export const openSize = (p: Position): number => (p === 'SB' ? 3 : 2.5);

/** 3-bet size: 3× in position, bigger from the blinds (out of position). */
export function threeBetSize(opener: Position, hero: Position): number {
  if (hero === 'BB' && opener === 'SB') return 9;
  if (hero === 'SB' || hero === 'BB') return 11;
  return 7.5;
}

export function fourBetSize(threeBet: number): number {
  if (threeBet <= 7.5) return 20;
  if (threeBet <= 9) return 22;
  return 24;
}

const fmt = (x: number) => (Number.isInteger(x) ? String(x) : x.toFixed(1));

// ------------------------------------------------------------ chart lookup

const EARLY9 = new Set<Position>(['UTG', 'UTG1', 'UTG2']);
const to6 = (p: Position): Position => (p === 'LJ' ? 'UTG' : p);

function chartFor(format: Format, key: string, positions: Position[]): { chart: ChartSource; source: 'chart' | 'mapped' } {
  if (format === '6max') return { chart: need(SIX_MAX, key), source: 'chart' };
  if (positions.some((p) => EARLY9.has(p))) return { chart: need(NINE_MAX, key), source: 'chart' };
  const [type, ...ps] = key.split('/');
  const k6 = [type, ...ps.map((p) => to6(p as Position))].join('/');
  return { chart: need(SIX_MAX, k6), source: 'mapped' };
}

function need(book: Record<string, ChartSource>, key: string): ChartSource {
  const c = book[key];
  if (!c) throw new Error(`missing chart ${key}`);
  return c;
}

const rangeOf = (text: string | undefined) => Float32Array.from(text ? parseRange(text) : new Float64Array(169));

// ------------------------------------------------------------ building

interface Table {
  contrib: Map<Position, number>;
  history: PriorAction[];
}

function freshTable(): Table {
  return { contrib: new Map<Position, number>([['SB', 0.5], ['BB', 1]]), history: [] };
}

function act(t: Table, pos: Position, kind: PriorAction['kind'], to?: number): void {
  t.history.push(to === undefined ? { pos, kind } : { pos, kind, to });
  if (to !== undefined) t.contrib.set(pos, to);
}

/** Every seat strictly between `from` and `to` in preflop order folds (wrapping is never needed). */
function foldBetween(t: Table, seats: readonly Position[], from: number, to: number): void {
  for (let i = from + 1; i < to; i++) act(t, seats[i]!, 'fold');
}

const potOf = (t: Table) => [...t.contrib.values()].reduce((a, b) => a + b, 0);

function makeSpot(format: Format, type: SpotType, hero: Position, villain: Position | null): PreflopSpot {
  const seats = SEATS[format];
  const hi = seats.indexOf(hero);
  const t = freshTable();
  let key: string;
  let positions: Position[];
  let actions: PfAction[];
  let toCall: number;
  const shape: Array<'raise' | 'call' | 'allin'> = [];

  if (type === 'RFI') {
    key = `RFI/${hero}`;
    positions = [hero];
    foldBetween(t, seats, -1, hi);
    const o = openSize(hero);
    actions = [{ kind: 'fold', label: 'Fold' }, { kind: 'raise', to: o, label: `Raise ${fmt(o)}` }];
    shape.push('raise');
    toCall = 1 - (t.contrib.get(hero) ?? 0);
  } else {
    const v = villain!;
    const vi = seats.indexOf(v);
    if (type === 'vsRFI') {
      key = `vsRFI/${hero}/${v}`;
      positions = [hero, v];
      foldBetween(t, seats, -1, vi);
      const o = openSize(v);
      act(t, v, 'raise', o);
      foldBetween(t, seats, vi, hi);
      const tb = threeBetSize(v, hero);
      actions = [
        { kind: 'fold', label: 'Fold' },
        { kind: 'call', to: o, label: 'Call' },
        { kind: 'raise', to: tb, label: `3-Bet ${fmt(tb)}` },
      ];
      shape.push('call', 'raise');
      toCall = o - (t.contrib.get(hero) ?? 0);
    } else if (type === 'vs3B') {
      key = `vs3B/${hero}/${v}`;
      positions = [hero, v];
      foldBetween(t, seats, -1, hi);
      const o = openSize(hero);
      act(t, hero, 'raise', o);
      foldBetween(t, seats, hi, vi);
      const tb = threeBetSize(hero, v);
      act(t, v, 'raise', tb);
      foldBetween(t, seats, vi, seats.length);
      const fb = fourBetSize(tb);
      actions = [
        { kind: 'fold', label: 'Fold' },
        { kind: 'call', to: tb, label: 'Call' },
        { kind: 'raise', to: fb, label: `4-Bet ${fmt(fb)}` },
      ];
      shape.push('call', 'raise');
      toCall = tb - o;
    } else {
      key = `vs4B/${hero}/${v}`;
      positions = [hero, v];
      foldBetween(t, seats, -1, vi);
      const o = openSize(v);
      act(t, v, 'raise', o);
      foldBetween(t, seats, vi, hi);
      const tb = threeBetSize(v, hero);
      act(t, hero, 'raise', tb);
      foldBetween(t, seats, hi, seats.length);
      const fb = fourBetSize(tb);
      act(t, v, 'raise', fb);
      actions = [
        { kind: 'fold', label: 'Fold' },
        { kind: 'call', to: fb, label: 'Call' },
        { kind: 'allin', to: STACK_BB, label: 'All-in' },
      ];
      shape.push('call', 'allin');
      toCall = fb - tb;
    }
  }

  const { chart, source } = chartFor(format, key, positions);
  // vs3B charts may add a jam over the 3-bet.
  if (type === 'vs3B' && chart.allin) {
    actions.push({ kind: 'allin', to: STACK_BB, label: 'All-in' });
    shape.push('allin');
  }
  const parts = shape.map((k) => rangeOf(chart[k]));
  const fold = new Float32Array(169);
  for (let i = 0; i < 169; i++) fold[i] = Math.max(0, 1 - parts.reduce((s, r) => s + r[i]!, 0));
  const strategy = [fold, ...parts];

  // Which hands can be here: everything, or what took the hero's earlier action.
  let reach: Float32Array;
  if (type === 'vs3B') reach = rangeOf(chartFor(format, `RFI/${hero}`, [hero]).chart.raise);
  else if (type === 'vs4B') reach = rangeOf(chartFor(format, `vsRFI/${hero}/${villain}`, positions).chart.raise);
  else reach = new Float32Array(169).fill(1);

  const heroIn = type === 'vs3B' ? openSize(hero) : type === 'vs4B' ? threeBetSize(villain!, hero) : hero === 'SB' ? 0.5 : hero === 'BB' ? 1 : 0;

  return {
    id: `${format}/${key}`,
    format,
    type,
    hero,
    villain,
    actions,
    strategy,
    reach,
    history: t.history,
    heroIn,
    toCall,
    pot: potOf(t),
    note: chart.note,
    source,
  };
}

function buildAll(): PreflopSpot[] {
  const out: PreflopSpot[] = [];
  for (const format of ['6max', '9max'] as const) {
    const seats = SEATS[format];
    for (const hero of seats) if (hero !== 'BB') out.push(makeSpot(format, 'RFI', hero, null));
    for (const type of ['vsRFI', 'vs3B', 'vs4B'] as const) {
      for (let i = 0; i < seats.length - 1; i++) {
        for (let j = i + 1; j < seats.length; j++) {
          const opener = seats[i]!;
          const later = seats[j]!;
          if (type === 'vs3B') out.push(makeSpot(format, type, opener, later));
          else out.push(makeSpot(format, type, later, opener));
        }
      }
    }
  }
  return out;
}

let all: PreflopSpot[] | null = null;

/** All preflop spots (built on first use). */
export function preflopSpots(): PreflopSpot[] {
  return (all ??= buildAll());
}

let byId: Map<string, PreflopSpot> | null = null;
export function preflopSpot(id: string): PreflopSpot | undefined {
  byId ??= new Map(preflopSpots().map((s) => [s.id, s]));
  return byId.get(id);
}

/** Frequencies of each action for one hand class. */
export function freqsOf(spot: PreflopSpot, cls: string): number[] {
  const i = CLASS_INDEX.get(cls)!;
  return spot.strategy.map((s) => s[i]!);
}

/** The share of the hero's hands at this spot (weighted by reach) taking each action. */
export function actionTotals(spot: PreflopSpot): number[] {
  const tot = spot.actions.map(() => 0);
  let den = 0;
  for (let i = 0; i < 169; i++) {
    const h = HAND_CLASSES[i]!;
    const w = spot.reach[i]! * (h.length === 2 ? 6 : h[2] === 's' ? 4 : 12);
    den += w;
    spot.strategy.forEach((s, a) => (tot[a]! += w * s[i]!));
  }
  return tot.map((x) => (den > 0 ? x / den : 0));
}

/** Short title: "UTG open", "BB vs BTN open", "BTN vs BB 3-bet", "BB vs BTN 4-bet". */
export function spotTitle(spot: PreflopSpot): string {
  const P = (p: Position) => (p === 'UTG1' ? 'UTG+1' : p === 'UTG2' ? 'UTG+2' : p);
  switch (spot.type) {
    case 'RFI':
      return `${P(spot.hero)} open`;
    case 'vsRFI':
      return `${P(spot.hero)} vs ${P(spot.villain!)} open`;
    case 'vs3B':
      return `${P(spot.hero)} vs ${P(spot.villain!)} 3-bet`;
    case 'vs4B':
      return `${P(spot.hero)} vs ${P(spot.villain!)} 4-bet`;
  }
}
