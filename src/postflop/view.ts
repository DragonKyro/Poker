// Reading a solved flop: which player acts where, how often a line happens,
// a node's strategy per hand class (for the grid) and per hand category
// (overpairs, draws, air…).

import { COMBO_CARDS, COMBO_CLASS } from '@/poker/hands';
import { describeHand, BUCKETS, type Bucket } from '@/poker/madeHand';
import { parseCards, type Card } from '@/poker/cards';
import type { SolvedFlop, SolvedNode, StoredAction } from './types';

export const nodeAt = (f: SolvedFlop, path: string): SolvedNode | undefined => f.nodes.find((n) => n.path === path);

/**
 * The solver's EVs count from the start of the flop, so chips already bet on
 * this street show as lost. Shown to players they count from this decision
 * on — folding is worth 0, as in GTO Wizard.
 */
export const evFromHere = (nd: SolvedNode, ev: number): number => ev + nd.streetIn[nd.player];

/** Overall frequency of each action at a node (weighted by the actor's reach). */
export function nodeTotals(f: SolvedFlop, nd: SolvedNode): number[] {
  const n = f.hands[nd.player].length;
  const A = nd.actions.length;
  const tot = new Array<number>(A).fill(0);
  let den = 0;
  for (let h = 0; h < n; h++) {
    const w = nd.reach[h]!;
    if (!w) continue;
    den += w;
    for (let a = 0; a < A; a++) tot[a]! += w * nd.freq[a * n + h]!;
  }
  return tot.map((x) => (den ? x / den : 0));
}

/** How often the line to `path` happens (the product of each step's overall frequency). */
export function pathFrequency(f: SolvedFlop, path: string): number {
  const ids = path ? path.split('-') : [];
  let p = 1;
  for (let i = 0; i < ids.length; i++) {
    const prefix = ids.slice(0, i).join('-');
    const nd = nodeAt(f, prefix);
    if (!nd) continue; // a forced check
    const a = nd.actions.findIndex((x) => x.id === ids[i]);
    if (a < 0) return 0;
    p *= nodeTotals(f, nd)[a]!;
  }
  return p;
}

export interface FlopStep {
  player: 0 | 1;
  action: StoredAction;
}

/** The actions along a path with their sizes (a missing node is a forced check). */
export function pathSteps(f: SolvedFlop, path: string): FlopStep[] {
  const ids = path ? path.split('-') : [];
  const out: FlopStep[] = [];
  let player: 0 | 1 = 0;
  for (let i = 0; i < ids.length; i++) {
    const nd = nodeAt(f, ids.slice(0, i).join('-'));
    const action = nd?.actions.find((x) => x.id === ids[i]) ?? { kind: 'check' as const, id: 'x', to: 0 };
    out.push({ player: nd?.player ?? player, action });
    player = (1 - (nd?.player ?? player)) as 0 | 1;
  }
  return out;
}

/** Per-class strategy at a node, for the grid: freqs[action][class], reach[class] (0..1). */
export function classGrid(f: SolvedFlop, nd: SolvedNode): { freqs: Float32Array[]; reach: Float32Array } {
  const hands = f.hands[nd.player];
  const n = hands.length;
  const A = nd.actions.length;
  const board = new Set(parseCards(f.board));
  const freqs = Array.from({ length: A }, () => new Float32Array(169));
  const w = new Float32Array(169);
  const live = new Float32Array(169);
  for (let i = 0; i < 1326; i++) {
    const [a, b] = COMBO_CARDS[i]!;
    if (!board.has(a) && !board.has(b)) live[COMBO_CLASS[i]!]! += 1;
  }
  for (let h = 0; h < n; h++) {
    const c = COMBO_CLASS[hands[h]!]!;
    const r = nd.reach[h]!;
    if (!r) continue;
    w[c]! += r;
    for (let a = 0; a < A; a++) freqs[a]![c]! += r * nd.freq[a * n + h]!;
  }
  const reach = new Float32Array(169);
  for (let c = 0; c < 169; c++) {
    if (w[c]! > 0) for (let a = 0; a < A; a++) freqs[a]![c]! /= w[c]!;
    reach[c] = live[c]! > 0 ? w[c]! / live[c]! : 0;
  }
  return { freqs, reach };
}

export interface BucketRow {
  bucket: Bucket;
  /** Share of the actor's range (by reach) in this bucket. */
  share: number;
  freqs: number[];
}

/** How each hand category plays at a node. */
export function bucketRows(f: SolvedFlop, nd: SolvedNode): BucketRow[] {
  const hands = f.hands[nd.player];
  const n = hands.length;
  const A = nd.actions.length;
  const board = parseCards(f.board);
  const acc = new Map<Bucket, { w: number; f: number[] }>();
  let total = 0;
  for (let h = 0; h < n; h++) {
    const r = nd.reach[h]!;
    if (!r) continue;
    const [a, b] = COMBO_CARDS[hands[h]!]!;
    const bucket = describeHand([a, b], board).bucket;
    const row = acc.get(bucket) ?? { w: 0, f: new Array<number>(A).fill(0) };
    row.w += r;
    for (let k = 0; k < A; k++) row.f[k]! += r * nd.freq[k * n + h]!;
    acc.set(bucket, row);
    total += r;
  }
  return BUCKETS.filter((b) => acc.has(b)).map((b) => {
    const row = acc.get(b)!;
    return { bucket: b, share: row.w / total, freqs: row.f.map((x) => x / row.w) };
  });
}

/** The combos of one class at a node: cards, strategy, EVs. */
export function classCombos(f: SolvedFlop, nd: SolvedNode, cls: number): Array<{ cards: [Card, Card]; reach: number; freqs: number[]; evs: number[] }> {
  const hands = f.hands[nd.player];
  const n = hands.length;
  const A = nd.actions.length;
  const out: Array<{ cards: [Card, Card]; reach: number; freqs: number[]; evs: number[] }> = [];
  for (let h = 0; h < n; h++) {
    if (COMBO_CLASS[hands[h]!] !== cls) continue;
    const [a, b] = COMBO_CARDS[hands[h]!]!;
    out.push({
      cards: [a, b],
      reach: nd.reach[h]!,
      freqs: Array.from({ length: A }, (_, k) => nd.freq[k * n + h]!),
      evs: Array.from({ length: A }, (_, k) => evFromHere(nd, nd.ev[k * n + h]!)),
    });
  }
  return out;
}
