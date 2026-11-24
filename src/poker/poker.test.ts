import { parseCards, cardStr, parseCard } from './cards';
import { evaluate, categoryOf, Cat } from './eval';
import { HAND_CLASSES, combosOf, comboIndex, COMBO_CARDS, COMBO_CLASS, classAt, CLASS_INDEX } from './hands';
import { formatRange, parseRange, rangeCombos } from './range';

const ev = (s: string) => evaluate(parseCards(s));

describe('cards & hands', () => {
  it('round-trips cards', () => {
    for (let c = 0; c < 52; c++) expect(parseCard(cardStr(c))).toBe(c);
  });
  it('indexes 1326 combos uniquely', () => {
    const seen = new Set<number>();
    for (let a = 0; a < 52; a++) for (let b = 0; b < a; b++) seen.add(comboIndex(a, b));
    expect(seen.size).toBe(1326);
    expect(Math.max(...seen)).toBe(1325);
    for (let i = 0; i < 1326; i++) expect(comboIndex(...COMBO_CARDS[i]!)).toBe(i);
  });
  it('lays out the grid', () => {
    expect(classAt(0, 0)).toBe('AA');
    expect(classAt(0, 1)).toBe('AKs');
    expect(classAt(1, 0)).toBe('AKo');
    expect(classAt(12, 12)).toBe('22');
    expect(HAND_CLASSES.length).toBe(169);
    let n = 0;
    for (const h of HAND_CLASSES) n += combosOf(h).length;
    expect(n).toBe(1326);
    const counts = new Map<number, number>();
    for (let i = 0; i < 1326; i++) counts.set(COMBO_CLASS[i]!, (counts.get(COMBO_CLASS[i]!) ?? 0) + 1);
    expect(counts.get(CLASS_INDEX.get('AKs')!)).toBe(4);
    expect(counts.get(CLASS_INDEX.get('AKo')!)).toBe(12);
    expect(counts.get(CLASS_INDEX.get('77')!)).toBe(6);
  });
});

describe('evaluate', () => {
  it('orders categories', () => {
    const hands = [
      'As Kd 9h 7c 3s 2d 4h', // high
      'As Ad 9h 7c 3s 2d 5h', // pair
      'As Ad 9h 9c 3s 2d 5h', // two pair
      'As Ad Ah 9c 3s 2d 5h', // trips
      'As 2d 3h 4c 5s 9d Kh', // wheel
      '6s 2d 3h 4c 5s 9d Kh', // six-high straight
      'As Ks 9s 7s 3s 2d 4h', // flush
      'As Ad Ah 9c 9s 2d 5h', // full house
      'As Ad Ah Ac 9s 2d 5h', // quads
      'As 2s 3s 4s 5s 9d Kh', // steel wheel
      'Ts Js Qs Ks As 9d Kh', // royal
    ].map(ev);
    for (let i = 1; i < hands.length; i++) expect(hands[i]!).toBeGreaterThan(hands[i - 1]!);
    expect(categoryOf(hands[4]!)).toBe(Cat.Straight);
    expect(categoryOf(hands[10]!)).toBe(Cat.StraightFlush);
  });
  it('uses kickers', () => {
    expect(ev('As Ad Kh 7c 3s 2d 4h')).toBeGreaterThan(ev('As Ad Qh 7c 3s 2d 4h'));
    expect(ev('As Ad Kh Kc 3s 2d 4h')).toBeGreaterThan(ev('As Ad Qh Qc 3s 2d Jh'));
    expect(ev('Ks Kd 7h 7c 2s 2d Ah')).toBeGreaterThan(ev('Ks Kd 7h 7c 2s 2d Qh'));
    expect(ev('Ks Kd 7h 7c 2s 2d Ah')).toBe(ev('Kc Kh 7s 7d 3s 3d Ah'));
    expect(ev('9s 9d 9h 5c 5s 2d 2h')).toBe(ev('9s 9d 9h 5c 5s 3d 2h'));
    expect(ev('9s 9d 9h 5c 5s 5d 2h')).toBeGreaterThan(ev('9s 9d 9h 4c 4s 4d Ah'));
    expect(categoryOf(ev('Ah Kh 2h 3h 9h 5d 4d'))).toBe(Cat.Flush); // flush over the wheel
    expect(categoryOf(ev('Ah Kd 2h 3h 4h 5h 6d'))).toBe(Cat.StraightFlush);
    // board plays
    expect(ev('As Ks Qd Jc Th 2d 3h')).toBe(ev('As Ks Qd Jc Th 4d 5h'));
  });
  it('agrees with brute force over 5-card subsets', () => {
    let seed = 7;
    const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let t = 0; t < 3000; t++) {
      const deck = Array.from({ length: 52 }, (_, i) => i);
      for (let i = 51; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [deck[i], deck[j]] = [deck[j]!, deck[i]!];
      }
      const seven = deck.slice(0, 7);
      let best = -1;
      for (let a = 0; a < 7; a++) for (let b = a + 1; b < 7; b++) best = Math.max(best, evaluate(seven.filter((_, i) => i !== a && i !== b)));
      expect(evaluate(seven)).toBe(best);
    }
  });
});

describe('range notation', () => {
  it('expands tokens', () => {
    const r = parseRange('TT+, ATs+, K9s-K7s, KQo, 76s:0.5, QJ');
    const has = (h: string) => r[CLASS_INDEX.get(h)!];
    expect(has('TT')).toBe(1);
    expect(has('AA')).toBe(1);
    expect(has('99')).toBe(0);
    expect(has('ATs')).toBe(1);
    expect(has('AKs')).toBe(1);
    expect(has('A9s')).toBe(0);
    expect(has('K8s')).toBe(1);
    expect(has('K6s')).toBe(0);
    expect(has('KQo')).toBe(1);
    expect(has('76s')).toBe(0.5);
    expect(has('QJs')).toBe(1);
    expect(has('QJo')).toBe(1);
    expect(rangeCombos(r)).toBe(5 * 6 + 4 * 4 + 3 * 4 + 12 + 2 + 16);
  });
  it('round-trips through formatRange', () => {
    const text = 'QQ+,99-66,AKs,ATs-A8s,A5s:0.5,K9s+,QJs:0.25,AKo,KQo:0.75';
    const r = parseRange(text);
    expect(Array.from(parseRange(formatRange(r)))).toEqual(Array.from(r));
  });
  it('rejects nonsense', () => {
    expect(() => parseRange('AXs')).toThrow();
    expect(() => parseRange('AKs:2')).toThrow();
    expect(() => parseRange('AKs-QJs')).toThrow();
  });
});

import { classifyFlop, flopWeight } from './texture';
import { describeHand } from './madeHand';

describe('textures', () => {
  const fam = (s: string) => classifyFlop(parseCards(s)).family;
  it('assigns families', () => {
    expect(fam('As7d2c')).toBe('ace');
    expect(fam('KsQd6c')).toBe('broadway');
    expect(fam('Ks7d2c')).toBe('kq');
    expect(fam('9h8h6c')).toBe('connected');
    expect(fam('Jd9c8s')).toBe('connected');
    expect(fam('Js6d3c')).toBe('middle');
    expect(fam('8s4d2c')).toBe('low');
    expect(fam('8s8d3c')).toBe('paired');
    expect(fam('Ks8s3s')).toBe('monotone');
    expect(classifyFlop(parseCards('Ad5c4h')).connect).toBe('connected');
    expect(classifyFlop(parseCards('Ks7d2c')).connect).toBe('disconnected');
  });
  it('weights all 22100 flops', () => {
    // sum of weights over one representative per class = 22100
    const seen = new Map<string, number>();
    for (let a = 0; a < 52; a++)
      for (let b = a + 1; b < 52; b++)
        for (let c = b + 1; c < 52; c++) {
          const cs = [a, b, c];
          const key = cs.map((x) => x >> 2).sort().join() + '|' + flopWeight(cs) + '|' + classifyFlop(cs).suits;
          seen.set(key, (seen.get(key) ?? 0) + 1);
        }
    let total = 0;
    for (const n of seen.values()) total += n;
    expect(total).toBe(22100);
  });
});

describe('describeHand', () => {
  const d = (h: string, b: string) => describeHand(parseCards(h), parseCards(b));
  it('names made hands and draws', () => {
    expect(d('AhKd', 'Ks7d2c').made).toBe('Top pair, top kicker');
    expect(d('7h7c', 'Ks7d2c').made).toBe('Set');
    expect(d('QhQc', 'Js7d2c').bucket).toBe('overpair');
    expect(d('Ah5h', 'Kh7h2c').draws).toContain('Flush draw');
    expect(d('Ah5h', 'Kh7h2c').bucket).toBe('draw');
    expect(d('9h8c', 'Ts7d2c').draws).toContain('Open-ender');
    expect(d('9h6c', 'Ts7d2c').draws).toContain('Gutshot');
    expect(d('Ad3c', 'Ks7d2c').bucket).toBe('acehigh');
    expect(d('6d5c', 'Ks7d2c').bucket).toBe('air');
    expect(d('Kd7c', 'Ks7d2c').bucket).toBe('strong');
  });
});
