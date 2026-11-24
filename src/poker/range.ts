// Ranges in the usual text notation, per hand class:
//   "QQ+, 99-66, AKs, ATs+, K9s-K6s, KQo, A5s:0.5, 76s:0.25, KQ"
// Pairs: "TT", "TT+", "TT-77". Others: "AKs" / "AKo" / "AK" (both),
// "ATs+" (raise the kicker up to one below the top card), "K9s-K6s".
// ":w" sets the weight (0..1) of that token; a later token overrides an
// earlier one. The same notation PioSolver / GTO+ / GTO Wizard export.

import { RANKS } from './cards';
import { CLASS_INDEX, HAND_CLASSES, comboCount, type HandClass } from './hands';

/** Weight (0..1) of each of the 169 classes, in HAND_CLASSES order. */
export type ClassRange = Float64Array;

export const emptyRange = (): ClassRange => new Float64Array(169);

const rankIx = (ch: string): number => {
  const r = RANKS.indexOf(ch.toUpperCase());
  if (r < 0) throw new Error(`bad rank "${ch}"`);
  return r;
};

function expandToken(tok: string): HandClass[] {
  const plus = tok.endsWith('+');
  const body = plus ? tok.slice(0, -1) : tok;
  const dash = body.split('-');
  const parse = (h: string) => {
    if (h.length < 2 || h.length > 3) throw new Error(`bad hand "${h}"`);
    const hi = rankIx(h[0]!);
    const lo = rankIx(h[1]!);
    const kind = h[2]?.toLowerCase() ?? '';
    if (kind && kind !== 's' && kind !== 'o') throw new Error(`bad hand "${h}"`);
    if (hi === lo && kind) throw new Error(`bad pair "${h}"`);
    return hi >= lo ? { hi, lo, kind } : { hi: lo, lo: hi, kind };
  };
  const name = (hi: number, lo: number, kind: string): HandClass[] => {
    if (hi === lo) return [RANKS[hi]! + RANKS[lo]!];
    const base = RANKS[hi]! + RANKS[lo]!;
    return kind ? [base + kind] : [base + 's', base + 'o'];
  };
  const out: HandClass[] = [];
  if (dash.length === 2) {
    const a = parse(dash[0]!);
    const b = parse(dash[1]!);
    if (a.hi === a.lo && b.hi === b.lo) {
      for (let r = Math.min(a.hi, b.hi); r <= Math.max(a.hi, b.hi); r++) out.push(...name(r, r, ''));
    } else {
      if (a.hi !== b.hi || a.kind !== b.kind) throw new Error(`bad span "${tok}"`);
      for (let k = Math.min(a.lo, b.lo); k <= Math.max(a.lo, b.lo); k++) out.push(...name(a.hi, k, a.kind));
    }
    return out;
  }
  if (dash.length !== 1) throw new Error(`bad token "${tok}"`);
  const h = parse(body);
  if (!plus) return name(h.hi, h.lo, h.kind);
  if (h.hi === h.lo) {
    for (let r = h.hi; r <= 12; r++) out.push(...name(r, r, ''));
  } else {
    for (let k = h.lo; k < h.hi; k++) out.push(...name(h.hi, k, h.kind));
  }
  return out;
}

/** Parse a range string into class weights. Throws on bad notation (charts are checked by tests). */
export function parseRange(text: string): ClassRange {
  const out = emptyRange();
  for (const raw of text.split(',')) {
    const t = raw.trim();
    if (!t) continue;
    const [tok, w] = t.split(':');
    const weight = w === undefined ? 1 : Number(w);
    if (!(weight >= 0 && weight <= 1)) throw new Error(`bad weight in "${t}"`);
    for (const h of expandToken(tok!.trim())) out[CLASS_INDEX.get(h)!] = weight;
  }
  return out;
}

/** Combos in the range (weighted). */
export function rangeCombos(r: ClassRange): number {
  let n = 0;
  for (let i = 0; i < 169; i++) n += r[i]! * comboCount(HAND_CLASSES[i]!);
  return n;
}

/** Share of all 1326 combos, 0..1. */
export const rangePct = (r: ClassRange): number => rangeCombos(r) / 1326;

const fmtW = (w: number) => (w >= 0.995 ? '' : `:${Number(w.toFixed(3))}`);

/**
 * Compact text for a range: runs of pairs and of kickers with equal weight
 * are joined ("TT+", "K9s-K6s"). Round-trips through parseRange.
 */
export function formatRange(r: ClassRange, minWeight = 0.001): string {
  const parts: string[] = [];
  const w = (h: HandClass) => r[CLASS_INDEX.get(h)!]!;
  // pairs, high to low
  const pairRuns = (from: number, to: number, weight: number) => {
    const top = RANKS[from]!.repeat(2);
    if (from === to) return top + fmtW(weight);
    if (from === 12) return RANKS[to]!.repeat(2) + '+' + fmtW(weight);
    return `${top}-${RANKS[to]!.repeat(2)}${fmtW(weight)}`;
  };
  let p = 12;
  while (p >= 0) {
    const weight = w(RANKS[p]!.repeat(2));
    if (weight < minWeight) {
      p--;
      continue;
    }
    let q = p;
    while (q - 1 >= 0 && Math.abs(w(RANKS[q - 1]!.repeat(2)) - weight) < 1e-6) q--;
    parts.push(pairRuns(p, q, weight));
    p = q - 1;
  }
  for (const kind of ['s', 'o']) {
    for (let hi = 12; hi >= 1; hi--) {
      let k = hi - 1;
      while (k >= 0) {
        const h = RANKS[hi]! + RANKS[k]! + kind;
        const weight = w(h);
        if (weight < minWeight) {
          k--;
          continue;
        }
        let j = k;
        while (j - 1 >= 0 && Math.abs(w(RANKS[hi]! + RANKS[j - 1]! + kind) - weight) < 1e-6) j--;
        if (j === k) parts.push(h + fmtW(weight));
        else if (k === hi - 1) parts.push(`${RANKS[hi]}${RANKS[j]}${kind}+${fmtW(weight)}`);
        else parts.push(`${h}-${RANKS[hi]}${RANKS[j]}${kind}${fmtW(weight)}`);
        k = j - 1;
      }
    }
  }
  return parts.join(',');
}
