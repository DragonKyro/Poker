// The solver: terminal values against brute force, convergence (exploitability
// → 0) on river, turn and small flop games, and the values summing to the pot.

import { parseCards, rankOf } from '@/poker/cards';
import { evaluate } from '@/poker/eval';
import { COMBO_CARDS, NUM_COMBOS } from '@/poker/hands';
import { Solver, comboWeights } from './solver';
import { buildTree, type StreetConfig, type TreeConfig } from './tree';

const street = (over: Partial<StreetConfig> = {}): StreetConfig => ({
  oopBet: [0.5],
  ipBet: [0.5],
  oopRaise: [0.6],
  ipRaise: [0.6],
  allin: false,
  raiseCap: 2,
  ...over,
});

const tree = (streets: number, over: Partial<TreeConfig> = {}): TreeConfig => ({
  pot: 10,
  stack: 40,
  streets: Array.from({ length: streets }, () => street()),
  allinThreshold: 0.8,
  ...over,
});

let seed = 12345;
const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

/** A random partial range: each combo kept with probability `keep`, random weight. */
const randomRange = (keep: number) => comboWeights(() => (rand() < keep ? 0.2 + 0.8 * rand() : 0));

describe('tree', () => {
  it('builds a sane river tree', () => {
    const { nodes } = buildTree(tree(1));
    const root = nodes[0]!;
    expect(root.actions.map((a) => a.id)).toEqual(['x', 'b50']);
    const ipAfterCheck = nodes.find((n) => n.path === 'x')!;
    expect(ipAfterCheck.player).toBe(1);
    const facing = nodes.find((n) => n.path === 'x-b50')!;
    expect(facing.actions.map((a) => a.kind)).toEqual(['fold', 'call', 'raise']);
    // pot 10, bet 5: raise to 5 + 0.6 * 20 = 17
    expect(facing.actions[2]!.to).toBe(17);
    // the second raise is all-in only
    const reraise = nodes.find((n) => n.path === 'x-b50-r60')!;
    expect(reraise.actions.map((a) => a.kind)).toEqual(['fold', 'call', 'allin']);
    expect(reraise.actions[2]!.to).toBe(40);
  });

  it('turns big bets into all-ins', () => {
    const { nodes } = buildTree(tree(1, { stack: 6 }));
    expect(nodes[0]!.actions.map((a) => a.id)).toEqual(['x', 'a']);
  });
});

describe('terminal values', () => {
  it('match brute force on a river showdown and fold', () => {
    const board = parseCards('Ks9h7d4c2s');
    const s = new Solver({ board, ranges: [randomRange(0.5), randomRange(0.5)], tree: tree(1) });
    const S = s as unknown as {
      showdown: (nd: { committed: [number, number] }, p: 0 | 1, opp: Float32Array, b: number, out: Float32Array) => Float32Array;
      fold: (nd: { t: 'fold'; folder: 0 | 1; committed: [number, number]; k: number }, p: 0 | 1, opp: Float32Array) => Float32Array;
      c1: [Uint8Array, Uint8Array];
      c2: [Uint8Array, Uint8Array];
    };
    for (const p of [0, 1] as const) {
      const o = 1 - p;
      const opp = Float32Array.from({ length: s.n[o]! }, () => (rand() < 0.2 ? 0 : rand()));
      const committed: [number, number] = [7, 7];
      const out = S.showdown({ committed }, p, opp, 0, new Float32Array(s.n[p]!));
      const strength = (pl: number, h: number) => evaluate([...board, S.c1[pl]![h]!, S.c2[pl]![h]!]);
      for (let h = 0; h < s.n[p]!; h++) {
        let v = 0;
        const mine = strength(p, h);
        for (let g = 0; g < s.n[o]!; g++) {
          const a = S.c1[o]![g]!;
          const b = S.c2[o]![g]!;
          if (a === S.c1[p]![h] || a === S.c2[p]![h] || b === S.c1[p]![h] || b === S.c2[p]![h]) continue;
          const theirs = strength(o, g);
          v += opp[g]! * (mine > theirs ? 10 + 7 : mine < theirs ? -7 : 5);
        }
        expect(out[h]!).toBeCloseTo(v, 2);
      }
      const f = S.fold({ t: 'fold', folder: o as 0 | 1, committed: [3, 3], k: 0 }, p, opp);
      for (let h = 0; h < s.n[p]!; h++) {
        let v = 0;
        for (let g = 0; g < s.n[o]!; g++) {
          const a = S.c1[o]![g]!;
          const b = S.c2[o]![g]!;
          if (a === S.c1[p]![h] || a === S.c2[p]![h] || b === S.c1[p]![h] || b === S.c2[p]![h]) continue;
          v += opp[g]! * 13;
        }
        expect(f[h]!).toBeCloseTo(v, 2);
      }
    }
  });
});

describe('convergence', () => {
  it('solves a river spot to < 0.3% pot', () => {
    const board = parseCards('Ks9h7d4c2s');
    // OOP: a capped range; IP: polarised (sets/two pair and air).
    const oop = comboWeights((a, b) => {
      const r = [rankOf(a), rankOf(b)];
      return r.includes(11) || r.includes(7) || r.includes(5) ? 1 : 0.3;
    });
    const ip = comboWeights(() => 1);
    const s = new Solver({ board, ranges: [oop, ip], tree: tree(1) });
    s.run(300);
    const ex = s.exploitability();
    expect(ex).toBeLessThan(0.003);
    const [v0, v1] = s.evaluateAll();
    expect(v0 + v1).toBeCloseTo(10, 3);
  });

  it('solves a turn spot and keeps values zero-sum', () => {
    const board = parseCards('Qs8h5d2c');
    const s = new Solver({ board, ranges: [randomRange(0.25), randomRange(0.25)], tree: tree(2, { stack: 30 }) });
    s.run(10);
    const early = s.exploitability();
    s.run(140);
    const late = s.exploitability();
    expect(late).toBeLessThan(early);
    expect(late).toBeLessThan(0.006);
    const [v0, v1] = s.evaluateAll();
    expect(v0 + v1).toBeCloseTo(10, 2);
  });

  it('converges with compressed (16-bit) river regrets', () => {
    const board = parseCards('Jd9c4h2s');
    seed = 777;
    const ranges: [Float32Array, Float32Array] = [randomRange(0.25), randomRange(0.25)];
    const plain = new Solver({ board, ranges, tree: tree(2, { stack: 30 }) });
    seed = 777;
    const packed = new Solver({ board, ranges, tree: tree(2, { stack: 30 }), compressRiver: true, avgStreets: 1 });
    plain.run(120);
    packed.run(120);
    expect(packed.memory).toBeLessThan(plain.memory * 0.6);
    const a = plain.exploitability();
    const b = packed.exploitability();
    expect(b).toBeLessThan(0.008);
    expect(Math.abs(a - b)).toBeLessThan(0.004);
  });

  it('runs a small flop game with all-ins', () => {
    const board = parseCards('Th7c3s');
    const small = { oopBet: [], ipBet: [0.75], oopRaise: [], ipRaise: [], allin: true, raiseCap: 1 };
    const s = new Solver({
      board,
      ranges: [randomRange(0.05), randomRange(0.05)],
      tree: { pot: 6, stack: 20, streets: [street({ allin: true }), street(small), street(small)], allinThreshold: 0.67 },
    });
    s.run(5);
    const early = s.exploitability();
    s.run(60);
    const late = s.exploitability();
    expect(Number.isFinite(late)).toBe(true);
    expect(late).toBeLessThan(early);
    expect(late).toBeLessThan(0.02);
    const [v0, v1] = s.evaluateAll();
    expect(v0 + v1).toBeCloseTo(6, 2);
    // Strategies at the root are distributions.
    const st = s.strategy(0);
    const n = s.n[0]!;
    for (let h = 0; h < n; h++) {
      let sum = 0;
      for (let a = 0; a < s.nodes[0]!.actions.length; a++) sum += st[a * n + h]!;
      expect(sum).toBeCloseTo(1, 4);
    }
  });
});

void NUM_COMBOS;
void COMBO_CARDS;
