import { parseCards } from '@/poker/cards';
import { classifyFlop, FAMILIES } from '@/poker/texture';
import { FLOP_LIST, flopsOf } from './flops';
import { POSTFLOP_SPOTS, nodeKind, spotRanges } from './spots';

describe('postflop set-up', () => {
  it('covers every family with valid flops', () => {
    expect(new Set(FLOP_LIST).size).toBe(FLOP_LIST.length);
    for (const f of FLOP_LIST) expect(parseCards(f).length).toBe(3);
    for (const fam of FAMILIES) expect(flopsOf(fam).length, fam).toBeGreaterThanOrEqual(3);
    const suits = new Set(FLOP_LIST.map((f) => classifyFlop(parseCards(f)).suits));
    expect(suits.size).toBe(3);
  });
  it('builds ranges of sensible size', () => {
    for (const s of POSTFLOP_SPOTS) {
      const [oop, ip] = spotRanges(s);
      const sum = (r: Float32Array) => r.reduce((a, b) => a + b, 0);
      console.log(s.id, 'OOP', sum(oop).toFixed(0), 'IP', sum(ip).toFixed(0));
      expect(sum(oop)).toBeGreaterThan(30);
      expect(sum(ip)).toBeGreaterThan(30);
    }
  });
  it('names node kinds', () => {
    expect(nodeKind('x', 1, 1)).toBe('cbet');
    expect(nodeKind('x-b33', 0, 1)).toBe('vsCbet');
    expect(nodeKind('x-b75-r60', 1, 1)).toBe('vsRaise');
    expect(nodeKind('', 0, 0)).toBe('cbet');
    expect(nodeKind('x', 1, 0)).toBe('stab');
    expect(nodeKind('x-b50', 0, 0)).toBe('vsStab');
  });
});
