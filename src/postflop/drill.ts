// Dealing flop drill hands: a spot, a solved flop of the chosen textures, a
// decision (c-bet, facing a c-bet, facing a raise…) weighted by how often
// the line really happens, and a hand the hero can hold there — leaning on
// the ones the solver mixes with, unless the set-up says otherwise.

import { parseCards, type Card } from '@/poker/cards';
import { COMBO_CARDS } from '@/poker/hands';
import { classifyFlop, type Family } from '@/poker/texture';
import type { PostflopSetup } from '@/store/prefsStore';
import { loadFlop, solvedFlops } from './load';
import { POSTFLOP_SPOTS, nodeKind, type NodeKind, type PostflopSpot } from './spots';
import type { SolvedFlop, SolvedNode } from './types';
import { pathFrequency } from './view';

export interface PostflopDeal {
  spot: PostflopSpot;
  flop: string;
  family: Family;
  data: SolvedFlop;
  node: SolvedNode;
  kind: NodeKind;
  /** Index of the hero's hand in the acting player's list. */
  hand: number;
  cards: [Card, Card];
  roll?: number;
  edge: boolean;
}

export const TRAINED_KINDS: readonly NodeKind[] = ['cbet', 'vsCbet', 'vsRaise', 'stab', 'vsStab'];

export function spotsWithData(): PostflopSpot[] {
  return POSTFLOP_SPOTS.filter((s) => solvedFlops(s.id).length > 0);
}

export function flopsFor(spot: PostflopSpot, families: readonly Family[]): string[] {
  return solvedFlops(spot.id).filter((f) => families.length === 0 || families.includes(classifyFlop(parseCards(f)).family));
}

function pick<T>(items: readonly T[], weight: (t: T) => number, rand: () => number): T | undefined {
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

export const statKey = (spot: string, kind: NodeKind, family: Family) => `po:${spot}/${kind}/${family}`;

/**
 * Deal one hand. `misses` are review keys 'po:<spot>/<kind>/<family>|<flop>/<path>/<combo>'.
 */
export async function dealPostflop(setup: PostflopSetup, opts: { rng: boolean; misses?: readonly string[]; rand?: () => number }): Promise<PostflopDeal | null> {
  const rand = opts.rand ?? Math.random;
  const spots = spotsWithData().filter((s) => setup.spots.length === 0 || setup.spots.includes(s.id));
  if (spots.length === 0) return null;

  if (setup.focus === 'review' && opts.misses?.length) {
    const pool = opts.misses
      .map((k) => {
        const [stat, rest] = k.slice(3).split('|') as [string, string];
        const [spot] = stat.split('/');
        const [flop, path, combo] = rest.split('/');
        return { spot: spot!, flop: flop!, path: path ?? '', combo: Number(combo) };
      })
      .filter((m) => spots.some((s) => s.id === m.spot) && solvedFlops(m.spot).includes(m.flop));
    const m = pool[Math.floor(rand() * Math.min(pool.length, 30))];
    if (m) {
      const spot = spots.find((s) => s.id === m.spot)!;
      const data = await loadFlop(m.spot, m.flop);
      const node = data.nodes.find((n) => n.path === m.path);
      const h = node ? data.hands[node.player].indexOf(m.combo) : -1;
      if (node && h >= 0) return finish(spot, m.flop, data, node, h, opts.rng, rand);
    }
  }

  for (let tries = 0; tries < 12; tries++) {
    const spot = spots[Math.floor(rand() * spots.length)]!;
    const flops = flopsFor(spot, setup.families);
    if (flops.length === 0) continue;
    const flop = flops[Math.floor(rand() * flops.length)]!;
    const data = await loadFlop(spot.id, flop);
    const nodes = data.nodes
      .map((n) => ({ n, kind: nodeKind(n.path, n.player, spot.pfr) }))
      .filter((x) => TRAINED_KINDS.includes(x.kind) && (setup.nodes.length === 0 || setup.nodes.includes(x.kind)));
    if (nodes.length === 0) continue;
    // A kind at random, then a node of it by how often its line happens.
    const kinds = [...new Set(nodes.map((x) => x.kind))];
    const kind = kinds[Math.floor(rand() * kinds.length)]!;
    const chosen = pick(
      nodes.filter((x) => x.kind === kind),
      (x) => pathFrequency(data, x.n.path),
      rand,
    );
    if (!chosen) continue;
    const node = chosen.n;
    const n = data.hands[node.player].length;
    const A = node.actions.length;
    const focus = setup.focus === 'review' ? 'smart' : setup.focus;
    const h = pick(
      Array.from({ length: n }, (_, k) => k),
      (k) => {
        const r = node.reach[k]!;
        if (focus === 'all') return r;
        let max = 0;
        for (let a = 0; a < A; a++) max = Math.max(max, node.freq[a * n + k]!);
        const edge = max < 0.85;
        if (focus === 'edges') return edge ? r : 0;
        return edge ? r : r * 0.25;
      },
      rand,
    );
    if (h === undefined) continue;
    return finish(spot, flop, data, node, h, opts.rng, rand);
  }
  return null;
}

function finish(spot: PostflopSpot, flop: string, data: SolvedFlop, node: SolvedNode, h: number, rng: boolean, rand: () => number): PostflopDeal {
  const n = data.hands[node.player].length;
  let max = 0;
  for (let a = 0; a < node.actions.length; a++) max = Math.max(max, node.freq[a * n + h]!);
  const [a, b] = COMBO_CARDS[data.hands[node.player][h]!]!;
  return {
    spot,
    flop,
    family: classifyFlop(parseCards(flop)).family,
    data,
    node,
    kind: nodeKind(node.path, node.player, spot.pfr),
    hand: h,
    cards: [a, b],
    roll: rng ? Math.floor(rand() * 100) : undefined,
    edge: max < 0.95,
  };
}
