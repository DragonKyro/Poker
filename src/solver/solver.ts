// Heads-up postflop solver: Discounted CFR (Brown & Sandholm 2019; α 1.5,
// β 0, γ 2) with alternating updates, vectorised over each player's range —
// one pass of the tree updates every hand at once, the way PioSolver,
// GTO+ and b-inary's postflop-solver work.
//
// Values are in bb as a share of the pot: folding is worth 0 from here on,
// winning the pot is worth the starting pot plus what the other put in.
// Card removal is exact: terminal values sum the opponent's hands that don't
// share a card with ours (inclusion–exclusion over per-card sums), and each
// dealt card removes the hands that hold it.

import { evaluate } from '@/poker/eval';
import { COMBO_CARDS, NUM_COMBOS, comboIndex } from '@/poker/hands';
import type { Card } from '@/poker/cards';
import { buildTree, type ActNode, type AllinNode, type ChanceNode, type FoldNode, type TNode, type TreeConfig } from './tree';

export interface SolveInput {
  /** 3, 4 or 5 cards. */
  board: Card[];
  /** Weight 0..1 of each of the 1326 combos: [OOP, IP]. */
  ranges: [ArrayLike<number>, ArrayLike<number>];
  tree: TreeConfig;
  /**
   * Keep the average strategy only on the first `avgStreets` streets (default
   * all). Later streets then play their current (regret-matched) strategy in
   * evaluations, which halves their memory; exploitability() measures that
   * profile, so it stays an honest check.
   */
  avgStreets?: number;
  /**
   * Store the river's regrets as 16-bit integers with one scale per runout
   * block (as b-inary's postflop-solver does): about half the memory of a flop
   * tree, for a small loss of precision. Default off.
   */
  compressRiver?: boolean;
}

const MODE_TRAIN = 0;
const MODE_BR = 1;
const MODE_EV = 2;
type Mode = typeof MODE_TRAIN | typeof MODE_BR | typeof MODE_EV;

const ALPHA = 1.5;
const GAMMA = 2;

type Pair<T> = [T, T];

export class Solver {
  readonly board: Card[];
  readonly root: TNode;
  readonly nodes: ActNode[];
  /** Hands of each player (combo indices) and their range weights. */
  readonly hands: Pair<Uint16Array>;
  readonly weight: Pair<Float32Array>;
  readonly n: Pair<number>;
  readonly pot0: number;
  iteration = 0;

  private readonly c1: Pair<Uint8Array>;
  private readonly c2: Pair<Uint8Array>;
  /** Per player, per card: indices of the hands holding it. */
  private readonly withCard: Pair<Int32Array[]>;
  /** Index of the same combo in the other player's list, or -1. */
  private readonly same: Pair<Int32Array>;
  /** Cards not on the board, and each card's index among them (-1 on the board). */
  private readonly rem: Card[];
  private readonly posInRem = new Int16Array(52).fill(-1);
  private readonly streets: number;
  /** Per final board: [player] hand strength (-1 if blocked) and ascending order. */
  private readonly strength: Pair<Int32Array>[] = [];
  private readonly order: Pair<Uint16Array>[] = [];
  /** Flop trees: all-in equity of every hand pair over all runouts, [p] row-major n[p] × n[1-p] (0 for clashing pairs). */
  private eq: Pair<Float32Array> | null = null;

  private readonly regret: Float32Array[];
  /** Compressed river regrets (compressRiver): values, a scale per instance, and a decode buffer. */
  private readonly regretQ: Array<Int16Array | null>;
  private readonly scaleQ: Array<Float32Array | null>;
  private readonly regBuf: Array<Float32Array | null>;
  private readonly avg: Float32Array[];
  /** EVs per action (MODE_EV) at the first street's nodes: [node id] → A × n. */
  private readonly ev = new Map<number, Float32Array>();
  /** Reach of the acting player at the first street's nodes (MODE_EV). */
  private readonly reachAt = new Map<number, Float32Array>();

  // scratch
  private readonly buf: Pair<Float32Array>[];
  private readonly buf2: Pair<Float32Array>[];
  private readonly buf3: Pair<Float32Array>[];
  private readonly stratBuf: Float32Array[];
  private readonly cardSum = new Float64Array(52);
  private readonly winS: Float64Array;
  private readonly loseS: Float64Array;
  private mode: Mode = MODE_TRAIN;
  private posF = 1;
  private negF = 1;
  private gF = 1;

  constructor(input: SolveInput) {
    this.board = [...input.board];
    if (this.board.length < 3 || this.board.length > 5) throw new Error('board must have 3–5 cards');
    this.streets = 6 - this.board.length; // 3 for a flop
    if (input.tree.streets.length !== this.streets) throw new Error(`tree needs ${this.streets} street configs`);
    const { root, nodes, count } = buildTree(input.tree);
    this.root = root;
    this.nodes = nodes;
    this.pot0 = input.tree.pot;

    const onBoard = new Set(this.board);
    this.rem = [];
    for (let c = 0; c < 52; c++) if (!onBoard.has(c)) this.rem.push(c);
    this.rem.forEach((c, i) => (this.posInRem[c] = i));

    const hands: number[][] = [[], []];
    const weight: number[][] = [[], []];
    for (let p = 0; p < 2; p++) {
      for (let i = 0; i < NUM_COMBOS; i++) {
        const w = input.ranges[p]![i]!;
        const [a, b] = COMBO_CARDS[i]!;
        if (w > 0 && !onBoard.has(a) && !onBoard.has(b)) {
          hands[p]!.push(i);
          weight[p]!.push(w);
        }
      }
    }
    this.hands = [Uint16Array.from(hands[0]!), Uint16Array.from(hands[1]!)];
    this.weight = [Float32Array.from(weight[0]!), Float32Array.from(weight[1]!)];
    this.n = [this.hands[0].length, this.hands[1].length];
    if (!this.n[0] || !this.n[1]) throw new Error('empty range');
    this.c1 = [new Uint8Array(this.n[0]), new Uint8Array(this.n[1])];
    this.c2 = [new Uint8Array(this.n[0]), new Uint8Array(this.n[1])];
    this.withCard = [[], []];
    const lookup: Pair<Map<number, number>> = [new Map(), new Map()];
    for (let p = 0; p < 2; p++) {
      const lists: number[][] = Array.from({ length: 52 }, () => []);
      this.hands[p]!.forEach((ci, h) => {
        const [a, b] = COMBO_CARDS[ci]!;
        this.c1[p]![h] = a;
        this.c2[p]![h] = b;
        lists[a]!.push(h);
        lists[b]!.push(h);
        lookup[p]!.set(ci, h);
      });
      this.withCard[p] = lists.map((l) => Int32Array.from(l));
    }
    this.same = [new Int32Array(this.n[0]), new Int32Array(this.n[1])];
    for (let p = 0; p < 2; p++) this.hands[p]!.forEach((ci, h) => (this.same[p]![h] = lookup[1 - p]!.get(ci) ?? -1));

    this.precomputeStrengths();
    if (this.streets === 3) this.precomputeEquity();

    // Regrets and average strategy per node, one block per instance (runout).
    const nRem = this.rem.length;
    const instances = (street: number) => (street === 0 ? 1 : street === 1 ? nRem : nRem * (nRem - 1));
    const lastStreet = this.streets - 1;
    const squash = (nd: ActNode) => !!input.compressRiver && lastStreet > 0 && nd.street === lastStreet;
    const size = (nd: ActNode) => instances(nd.street) * nd.actions.length * this.n[nd.player];
    this.regret = nodes.map((nd) => new Float32Array(squash(nd) ? 0 : size(nd)));
    this.regretQ = nodes.map((nd) => (squash(nd) ? new Int16Array(size(nd)) : null));
    this.scaleQ = nodes.map((nd) => (squash(nd) ? new Float32Array(instances(nd.street)) : null));
    this.regBuf = nodes.map((nd) => (squash(nd) ? new Float32Array(nd.actions.length * this.n[nd.player]) : null));
    const avgStreets = input.avgStreets ?? this.streets;
    this.avg = nodes.map((nd) => new Float32Array(nd.street < avgStreets ? instances(nd.street) * nd.actions.length * this.n[nd.player] : 0));

    const nMax = Math.max(this.n[0], this.n[1]);
    const mk = () => Array.from({ length: count }, () => [new Float32Array(this.n[0]), new Float32Array(this.n[1])] as Pair<Float32Array>);
    this.buf = mk();
    this.buf2 = mk();
    this.buf3 = mk();
    this.stratBuf = nodes.map((nd) => new Float32Array(nd.actions.length * this.n[nd.player]));
    this.winS = new Float64Array(nMax);
    this.loseS = new Float64Array(nMax);
  }

  /** Bytes held by regrets and strategy sums. */
  get memory(): number {
    let b = 0;
    for (const r of this.regret) b += r.byteLength;
    for (const r of this.avg) b += r.byteLength;
    for (const r of this.regretQ) b += r?.byteLength ?? 0;
    for (const r of this.scaleQ) b += r?.byteLength ?? 0;
    return b;
  }

  // ------------------------------------------------------------ setup

  private precomputeStrengths(): void {
    const cards = new Array<number>(7);
    for (let i = 0; i < this.board.length; i++) cards[i] = this.board[i]!;
    const runouts: number[][] = [];
    const R = this.rem;
    if (this.streets === 1) runouts.push([]);
    else if (this.streets === 2) for (const c of R) runouts.push([c]);
    else for (let j = 0; j < R.length; j++) for (let i = 0; i < j; i++) runouts.push([R[i]!, R[j]!]); // index j*(j-1)/2 + i
    for (const extra of runouts) {
      for (let i = 0; i < extra.length; i++) cards[this.board.length + i] = extra[i]!;
      const st: Pair<Int32Array> = [new Int32Array(this.n[0]), new Int32Array(this.n[1])];
      const ord: Pair<Uint16Array> = [new Uint16Array(this.n[0]), new Uint16Array(this.n[1])];
      for (let p = 0; p < 2; p++) {
        const s = st[p]!;
        for (let h = 0; h < this.n[p]!; h++) {
          const a = this.c1[p]![h]!;
          const b = this.c2[p]![h]!;
          if (extra.includes(a) || extra.includes(b)) {
            s[h] = -1;
            continue;
          }
          cards[5] = a;
          cards[6] = b;
          s[h] = evaluate(cards, 7);
        }
        const idx = Array.from({ length: this.n[p]! }, (_, h) => h).sort((x, y) => s[x]! - s[y]!);
        ord[p]!.set(idx);
      }
      this.strength.push(st);
      this.order.push(ord);
    }
  }

  /** Pairwise all-in equity on the flop (two cards to come), so a flop all-in is one matrix-vector product. */
  private precomputeEquity(): void {
    const [n0, n1] = this.n;
    const e0 = new Float32Array(n0 * n1);
    for (const [st0, st1] of this.strength) {
      for (let h = 0; h < n0; h++) {
        const s = st0[h]!;
        if (s < 0) continue;
        const row = h * n1;
        for (let g = 0; g < n1; g++) {
          const t = st1[g]!;
          if (t < 0) continue;
          e0[row + g]! += s > t ? 1 : s === t ? 0.5 : 0;
        }
      }
    }
    const m = this.rem.length - 4;
    const runs = (m * (m - 1)) / 2;
    for (let i = 0; i < e0.length; i++) e0[i]! /= runs;
    for (let h = 0; h < n0; h++) {
      for (const card of [this.c1[0][h]!, this.c2[0][h]!]) for (const g of this.withCard[1][card]!) e0[h * n1 + g] = 0;
    }
    const e1 = new Float32Array(n1 * n0);
    for (let h = 0; h < n0; h++) {
      for (let g = 0; g < n1; g++) {
        const v = e0[h * n1 + g]!;
        e1[g * n0 + h] = v === 0 && this.clash(h, g) ? 0 : 1 - v;
      }
    }
    this.eq = [e0, e1];
  }

  private clash(h0: number, h1: number): boolean {
    const a = this.c1[0][h0]!;
    const b = this.c2[0][h0]!;
    const c = this.c1[1][h1]!;
    const d = this.c2[1][h1]!;
    return a === c || a === d || b === c || b === d;
  }

  private inst(street: number, d1: number, d2: number): number {
    if (street === 0) return 0;
    const i = this.posInRem[d1]!;
    if (street === 1) return i;
    const j = this.posInRem[d2]!;
    return i * (this.rem.length - 1) + (j > i ? j - 1 : j);
  }

  private finalBoard(d1: number, d2: number): number {
    if (this.streets === 1) return 0;
    if (this.streets === 2) return this.posInRem[d1]!;
    const i = this.posInRem[d1]!;
    const j = this.posInRem[d2]!;
    const hi = i > j ? i : j;
    const lo = i > j ? j : i;
    return (hi * (hi - 1)) / 2 + lo;
  }

  // ------------------------------------------------------------ public API

  /** Run `iterations` more DCFR iterations. */
  run(iterations: number): void {
    this.mode = MODE_TRAIN;
    for (let k = 0; k < iterations; k++) {
      const t = ++this.iteration;
      if (t > 1) {
        const pa = Math.pow(t - 1, ALPHA);
        this.posF = pa / (pa + 1);
        this.negF = 0.5;
        this.gF = Math.pow((t - 1) / t, GAMMA);
      } else {
        this.posF = this.negF = this.gF = 1;
      }
      for (let p = 0 as 0 | 1; p < 2; p++) this.walk(this.root, p as 0 | 1, this.weight[p]!, this.weight[1 - p]!, -1, -1);
    }
  }

  /** Expected value (bb, pot share) of each player's whole range against the other's average strategy. */
  bestResponse(): Pair<number> {
    this.mode = MODE_BR;
    const out: Pair<number> = [0, 0];
    for (let p = 0 as 0 | 1; p < 2; p++) {
      const v = this.walk(this.root, p as 0 | 1, this.weight[p]!, this.weight[1 - p]!, -1, -1);
      out[p] = this.rangeValue(p as 0 | 1, v);
    }
    this.mode = MODE_TRAIN;
    return out;
  }

  /** Exploitability as a share of the starting pot (0.01 = 1% pot): the average gain of a best response. */
  exploitability(): number {
    const [a, b] = this.bestResponse();
    return (a + b - this.pot0) / 2 / this.pot0;
  }

  /** Each range's value under the average strategies (they sum to the pot). */
  evaluateAll(): Pair<number> {
    this.mode = MODE_EV;
    this.ev.clear();
    this.reachAt.clear();
    const out: Pair<number> = [0, 0];
    for (let p = 0 as 0 | 1; p < 2; p++) {
      const v = this.walk(this.root, p as 0 | 1, this.weight[p]!, this.weight[1 - p]!, -1, -1);
      out[p] = this.rangeValue(p as 0 | 1, v);
    }
    this.mode = MODE_TRAIN;
    return out;
  }

  /** Average strategy at a first-street node: A × n (action-major), rows sum to 1. */
  strategy(nodeId: number): Float32Array {
    const nd = this.nodes[nodeId]!;
    const n = this.n[nd.player]!;
    const out = new Float32Array(nd.actions.length * n);
    this.avgStrategy(nd, 0, out);
    return out;
  }

  /** After evaluateAll(): per-action EV (bb) of each hand at a first-street node, A × n. */
  actionEV(nodeId: number): Float32Array | undefined {
    return this.ev.get(nodeId);
  }

  /** After evaluateAll(): the acting player's reach of each hand at a first-street node. */
  reach(nodeId: number): Float32Array | undefined {
    return this.reachAt.get(nodeId);
  }

  private rangeValue(p: 0 | 1, v: Float32Array): number {
    // Normalise by the weight of all compatible hand pairs.
    const o = 1 - p;
    const total = this.cardSums(o as 0 | 1, this.weight[o]!);
    let num = 0;
    let den = 0;
    const w = this.weight[p]!;
    for (let h = 0; h < this.n[p]!; h++) {
      const compat = this.compat(p, h, total, this.weight[o]!);
      num += w[h]! * v[h]!;
      den += w[h]! * compat;
    }
    return num / den;
  }

  // ------------------------------------------------------------ traversal

  private walk(node: TNode, p: 0 | 1, my: Float32Array, opp: Float32Array, d1: number, d2: number): Float32Array {
    switch (node.t) {
      case 'act':
        return node.player === p ? this.own(node, p, my, opp, d1, d2) : this.other(node, p, my, opp, d1, d2);
      case 'chance':
        return this.chance(node, p, my, opp, d1, d2);
      case 'fold':
        return this.fold(node, p, opp);
      case 'show':
        return this.showdown(node, p, opp, this.finalBoard(d1, d2), this.buf[node.k]![p]!);
      case 'allin':
        return this.allin(node, p, opp, d1, d2);
    }
  }

  private regretMatch(nd: ActNode, inst: number, out: Float32Array): void {
    const A = nd.actions.length;
    const n = this.n[nd.player]!;
    // Compressed regrets share one positive scale per block, which cancels out.
    const R: ArrayLike<number> = this.regretQ[nd.id] ?? this.regret[nd.id]!;
    const base = inst * A * n;
    for (let h = 0; h < n; h++) {
      let sum = 0;
      for (let a = 0; a < A; a++) {
        const r = R[base + a * n + h]!;
        if (r > 0) sum += r;
      }
      if (sum > 0) {
        for (let a = 0; a < A; a++) {
          const r = R[base + a * n + h]!;
          out[a * n + h] = r > 0 ? r / sum : 0;
        }
      } else {
        for (let a = 0; a < A; a++) out[a * n + h] = 1 / A;
      }
    }
  }

  private avgStrategy(nd: ActNode, inst: number, out: Float32Array): void {
    const S = this.avg[nd.id]!;
    if (S.length === 0) return this.regretMatch(nd, inst, out);
    const A = nd.actions.length;
    const n = this.n[nd.player]!;
    const base = inst * A * n;
    for (let h = 0; h < n; h++) {
      let sum = 0;
      for (let a = 0; a < A; a++) sum += S[base + a * n + h]!;
      if (sum > 0) for (let a = 0; a < A; a++) out[a * n + h] = S[base + a * n + h]! / sum;
      else for (let a = 0; a < A; a++) out[a * n + h] = 1 / A;
    }
  }

  private own(nd: ActNode, p: 0 | 1, my: Float32Array, opp: Float32Array, d1: number, d2: number): Float32Array {
    const A = nd.actions.length;
    const n = this.n[p]!;
    const inst = this.inst(nd.street, d1, d2);
    const strat = this.stratBuf[nd.id]!;
    const vals = this.buf[nd.k]![p]!;
    const childMy = this.buf2[nd.k]![p]!;
    const mode = this.mode;

    if (mode === MODE_TRAIN) {
      const q = this.regretQ[nd.id];
      const block = inst * A * n;
      let R: Float32Array;
      let base: number;
      if (q) {
        R = this.regBuf[nd.id]!;
        base = 0;
        const sc = this.scaleQ[nd.id]![inst]!;
        for (let i = 0, e = A * n; i < e; i++) R[i] = q[block + i]! * sc;
      } else {
        R = this.regret[nd.id]!;
        base = block;
      }
      // Discount the past (DCFR) and regret-match in one pass.
      const pf = this.iteration > 1 ? this.posF : 1;
      const nf = this.iteration > 1 ? this.negF : 1;
      for (let h = 0; h < n; h++) {
        let sum = 0;
        for (let a = 0; a < A; a++) {
          const i = base + a * n + h;
          const r = R[i]!;
          if (r > 0) {
            const d = r * pf;
            R[i] = d;
            sum += d;
          } else R[i] = r * nf;
        }
        if (sum > 0) {
          for (let a = 0; a < A; a++) {
            const r = R[base + a * n + h]!;
            strat[a * n + h] = r > 0 ? r / sum : 0;
          }
        } else {
          for (let a = 0; a < A; a++) strat[a * n + h] = 1 / A;
        }
      }
      vals.fill(0);
      for (let a = 0; a < A; a++) {
        const off = a * n;
        for (let h = 0; h < n; h++) childMy[h] = my[h]! * strat[off + h]!;
        const v = this.walk(nd.children[a]!, p, childMy, opp, d1, d2);
        const ro = base + off;
        for (let h = 0; h < n; h++) {
          const x = v[h]!;
          R[ro + h]! += x;
          vals[h]! += strat[off + h]! * x;
        }
      }
      const S = this.avg[nd.id]!;
      const keepAvg = S.length > 0;
      const g = this.gF;
      for (let a = 0; a < A; a++) {
        const ro = base + a * n;
        const so = block + a * n;
        const off = a * n;
        if (keepAvg) {
          for (let h = 0; h < n; h++) {
            R[ro + h]! -= vals[h]!;
            S[so + h] = S[so + h]! * g + my[h]! * strat[off + h]!;
          }
        } else {
          for (let h = 0; h < n; h++) R[ro + h]! -= vals[h]!;
        }
      }
      if (q) {
        let max = 0;
        for (let i = 0, e = A * n; i < e; i++) {
          const x = R[i]! < 0 ? -R[i]! : R[i]!;
          if (x > max) max = x;
        }
        const sc = max > 0 ? max / 32767 : 0;
        this.scaleQ[nd.id]![inst] = sc;
        const inv = sc > 0 ? 1 / sc : 0;
        for (let i = 0, e = A * n; i < e; i++) q[block + i] = Math.round(R[i]! * inv);
      }
      return vals;
    }

    this.avgStrategy(nd, inst, strat);
    if (mode === MODE_BR) {
      vals.fill(-Infinity);
      for (let a = 0; a < A; a++) {
        const v = this.walk(nd.children[a]!, p, my, opp, d1, d2);
        for (let h = 0; h < n; h++) if (v[h]! > vals[h]!) vals[h] = v[h]!;
      }
      return vals;
    }

    // MODE_EV: record per-action values at first-street nodes, normalised per hand.
    const record = nd.street === 0;
    let evs: Float32Array | undefined;
    let compat: Float64Array | undefined;
    if (record) {
      evs = new Float32Array(A * n);
      const o = (1 - p) as 0 | 1;
      const total = this.cardSums(o, opp);
      compat = new Float64Array(n);
      for (let h = 0; h < n; h++) compat[h] = this.compat(p, h, total, opp);
      this.reachAt.set(nd.id, Float32Array.from(my));
    }
    vals.fill(0);
    for (let a = 0; a < A; a++) {
      const off = a * n;
      for (let h = 0; h < n; h++) childMy[h] = my[h]! * strat[off + h]!;
      const v = this.walk(nd.children[a]!, p, childMy, opp, d1, d2);
      for (let h = 0; h < n; h++) {
        vals[h]! += strat[off + h]! * v[h]!;
        if (evs) evs[off + h] = compat![h]! > 0 ? v[h]! / compat![h]! : 0;
      }
    }
    if (evs) this.ev.set(nd.id, evs);
    return vals;
  }

  private other(nd: ActNode, p: 0 | 1, my: Float32Array, opp: Float32Array, d1: number, d2: number): Float32Array {
    const o = nd.player;
    const A = nd.actions.length;
    const no = this.n[o]!;
    const n = this.n[p]!;
    const inst = this.inst(nd.street, d1, d2);
    const strat = this.stratBuf[nd.id]!;
    if (this.mode === MODE_TRAIN) this.regretMatch(nd, inst, strat);
    else this.avgStrategy(nd, inst, strat);
    const vals = this.buf[nd.k]![p]!;
    const childOpp = this.buf2[nd.k]![o]!;
    vals.fill(0);
    for (let a = 0; a < A; a++) {
      const off = a * no;
      let any = false;
      for (let h = 0; h < no; h++) {
        const x = opp[h]! * strat[off + h]!;
        childOpp[h] = x;
        if (x !== 0) any = true;
      }
      if (!any && this.mode === MODE_TRAIN) continue; // nobody takes this action: its subtree is worth 0 to us
      const v = this.walk(nd.children[a]!, p, my, childOpp, d1, d2);
      for (let h = 0; h < n; h++) vals[h]! += v[h]!;
    }
    return vals;
  }

  private chance(nd: ChanceNode, p: 0 | 1, my: Float32Array, opp: Float32Array, d1: number, _d2: number): Float32Array {
    const o = (1 - p) as 0 | 1;
    const vals = this.buf[nd.k]![p]!;
    const myM = this.buf2[nd.k]![p]!;
    const oppM = this.buf3[nd.k]![o]!;
    myM.set(my);
    oppM.set(opp);
    vals.fill(0);
    const n = this.n[p]!;
    const wcP = this.withCard[p]!;
    const wcO = this.withCard[o]!;
    let dealt = 0;
    for (const c of this.rem) {
      if (c === d1) continue;
      const mine = wcP[c]!;
      const theirs = wcO[c]!;
      for (let i = 0; i < mine.length; i++) myM[mine[i]!] = 0;
      for (let i = 0; i < theirs.length; i++) oppM[theirs[i]!] = 0;
      const v = nd.street === 1 ? this.walk(nd.child, p, myM, oppM, c, -1) : this.walk(nd.child, p, myM, oppM, d1, c);
      for (let i = 0; i < mine.length; i++) v[mine[i]!] = 0;
      for (let h = 0; h < n; h++) vals[h]! += v[h]!;
      for (let i = 0; i < mine.length; i++) myM[mine[i]!] = my[mine[i]!]!;
      for (let i = 0; i < theirs.length; i++) oppM[theirs[i]!] = opp[theirs[i]!]!;
      dealt++;
    }
    // Every compatible pair of hands sees (cards left − 4) of the cards dealt.
    const scale = 1 / (dealt - 4);
    for (let h = 0; h < n; h++) vals[h]! *= scale;
    return vals;
  }

  // ------------------------------------------------------------ terminals

  /** Fills cardSum with the opponent's reach per card; returns the total. */
  private cardSums(o: 0 | 1, reach: ArrayLike<number>): number {
    const cs = this.cardSum;
    cs.fill(0);
    let total = 0;
    const a = this.c1[o]!;
    const b = this.c2[o]!;
    for (let h = 0, n = this.n[o]!; h < n; h++) {
      const w = reach[h]!;
      if (w === 0) continue;
      total += w;
      cs[a[h]!]! += w;
      cs[b[h]!]! += w;
    }
    return total;
  }

  /** Opponent reach compatible with my hand h (after cardSums). */
  private compat(p: 0 | 1, h: number, total: number, oppReach: ArrayLike<number>): number {
    const s = this.same[p]![h]!;
    return total - this.cardSum[this.c1[p]![h]!]! - this.cardSum[this.c2[p]![h]!]! + (s >= 0 ? oppReach[s]! : 0);
  }

  private fold(nd: FoldNode, p: 0 | 1, opp: Float32Array): Float32Array {
    const o = (1 - p) as 0 | 1;
    const out = this.buf[nd.k]![p]!;
    const total = this.cardSums(o, opp);
    const u = nd.folder === p ? -nd.committed[p] : this.pot0 + nd.committed[o];
    const cs = this.cardSum;
    const mc1 = this.c1[p]!;
    const mc2 = this.c2[p]!;
    const same = this.same[p]!;
    for (let h = 0, n = this.n[p]!; h < n; h++) {
      const sh = same[h]!;
      out[h] = u * (total - cs[mc1[h]!]! - cs[mc2[h]!]! + (sh >= 0 ? opp[sh]! : 0));
    }
    return out;
  }

  /** Showdown on final board `b`: win the starting pot plus the other's chips, lose ours, split the starting pot. */
  private showdown(nd: { committed: [number, number] }, p: 0 | 1, opp: Float32Array, b: number, out: Float32Array): Float32Array {
    const o = (1 - p) as 0 | 1;
    const myStr = this.strength[b]![p]!;
    const opStr = this.strength[b]![o]!;
    const myOrd = this.order[b]![p]!;
    const opOrd = this.order[b]![o]!;
    const n = this.n[p]!;
    const no = this.n[o]!;
    const oc1 = this.c1[o]!;
    const oc2 = this.c2[o]!;
    const mc1 = this.c1[p]!;
    const mc2 = this.c2[p]!;
    const cs = this.cardSum;
    const win = this.winS;
    const lose = this.loseS;

    // Descending: opponent reach strictly above each of my hands.
    cs.fill(0);
    let tot = 0;
    let j = no - 1;
    for (let k = n - 1; k >= 0; ) {
      const s = myStr[myOrd[k]!]!;
      while (j >= 0) {
        const h = opOrd[j]!;
        if (opStr[h]! <= s) break;
        const w = opp[h]!;
        if (w !== 0) {
          tot += w;
          cs[oc1[h]!]! += w;
          cs[oc2[h]!]! += w;
        }
        j--;
      }
      while (k >= 0) {
        const h = myOrd[k]!;
        if (myStr[h]! !== s) break;
        lose[h] = tot - cs[mc1[h]!]! - cs[mc2[h]!]!;
        k--;
      }
    }
    // Ascending: strictly below; then run on to the end so cs / tot hold every
    // live opponent hand, which gives the compatible total without another pass.
    cs.fill(0);
    tot = 0;
    j = 0;
    for (let k = 0; k < n; ) {
      const s = myStr[myOrd[k]!]!;
      while (j < no) {
        const h = opOrd[j]!;
        if (opStr[h]! >= s) break;
        const w = opp[h]!;
        if (w !== 0 && opStr[h]! >= 0) {
          tot += w;
          cs[oc1[h]!]! += w;
          cs[oc2[h]!]! += w;
        }
        j++;
      }
      while (k < n) {
        const h = myOrd[k]!;
        if (myStr[h]! !== s) break;
        win[h] = tot - cs[mc1[h]!]! - cs[mc2[h]!]!;
        k++;
      }
    }
    for (; j < no; j++) {
      const h = opOrd[j]!;
      const w = opp[h]!;
      if (w !== 0 && opStr[h]! >= 0) {
        tot += w;
        cs[oc1[h]!]! += w;
        cs[oc2[h]!]! += w;
      }
    }
    const same = this.same[p]!;
    const C = nd.committed[p];
    const W = this.pot0 + nd.committed[o];
    const T = this.pot0 / 2;
    for (let h = 0; h < n; h++) {
      const sh = same[h]!;
      const c = tot - cs[mc1[h]!]! - cs[mc2[h]!]! + (sh >= 0 ? opp[sh]! : 0);
      const wv = win[h]!;
      const lv = lose[h]!;
      out[h] = wv * W - lv * C + (c - wv - lv) * T;
    }
    return out;
  }

  /** All-in before the river: average the showdown over every runout. */
  private allin(nd: AllinNode, p: 0 | 1, opp: Float32Array, d1: number, d2: number): Float32Array {
    const o = (1 - p) as 0 | 1;
    const out = this.buf[nd.k]![p]!;
    if (this.eq && nd.street === 0) {
      // value = equity × final pot − own chips
      const eq = this.eq[p]!;
      const n = this.n[p]!;
      const no = this.n[o]!;
      const pot = this.pot0 + nd.committed[0] + nd.committed[1];
      const C = nd.committed[p];
      const total = this.cardSums(o, opp);
      for (let h = 0; h < n; h++) {
        let acc = 0;
        const row = h * no;
        for (let g = 0; g < no; g++) acc += opp[g]! * eq[row + g]!;
        out[h] = acc * pot - C * this.compat(p, h, total, opp);
      }
      return out;
    }
    const tmp = this.buf2[nd.k]![p]!;
    const oppM = this.buf3[nd.k]![o]!;
    oppM.set(opp);
    out.fill(0);
    const n = this.n[p]!;
    const mc1 = this.c1[p]!;
    const mc2 = this.c2[p]!;
    const wcO = this.withCard[o]!;
    const toCome = this.streets - 1 - nd.street;
    const left = this.rem.filter((c) => c !== d1 && c !== d2);
    const zero = (c: number) => {
      const l = wcO[c]!;
      for (let i = 0; i < l.length; i++) oppM[l[i]!] = 0;
    };
    const restore = (c: number) => {
      const l = wcO[c]!;
      for (let i = 0; i < l.length; i++) oppM[l[i]!] = opp[l[i]!]!;
    };
    let runs: number;
    if (toCome === 1) {
      for (const c of left) {
        zero(c);
        const b = this.streets === 2 ? this.finalBoard(c, -1) : this.finalBoard(d1, c);
        const v = this.showdown(nd, p, oppM, b, tmp);
        for (let h = 0; h < n; h++) if (mc1[h] !== c && mc2[h] !== c) out[h]! += v[h]!;
        restore(c);
      }
      runs = left.length - 4;
    } else {
      for (let x = 0; x < left.length; x++) {
        const cx = left[x]!;
        zero(cx);
        for (let y = x + 1; y < left.length; y++) {
          const cy = left[y]!;
          zero(cy);
          const v = this.showdown(nd, p, oppM, this.finalBoard(cx, cy), tmp);
          for (let h = 0; h < n; h++) {
            const a = mc1[h]!;
            const b = mc2[h]!;
            if (a !== cx && a !== cy && b !== cx && b !== cy) out[h]! += v[h]!;
          }
          restore(cy);
          zero(cx); // restoring cy may have restored hands holding both cards
        }
        restore(cx);
      }
      const m = left.length - 4;
      runs = (m * (m - 1)) / 2;
    }
    const scale = 1 / runs;
    for (let h = 0; h < n; h++) out[h]! *= scale;
    return out;
  }
}

/** Range weights per combo from a function of the two cards. */
export function comboWeights(f: (a: Card, b: Card) => number): Float32Array {
  const out = new Float32Array(NUM_COMBOS);
  for (let i = 0; i < NUM_COMBOS; i++) out[i] = f(...COMBO_CARDS[i]!);
  return out;
}

export { comboIndex };
