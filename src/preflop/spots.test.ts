import { preflopSpots, preflopSpot, actionTotals, freqsOf } from './spots';

describe('preflop spots', () => {
  const all = preflopSpots();
  it('builds every spot of both formats', () => {
    expect(all.filter((s) => s.format === '6max').length).toBe(50);
    expect(all.filter((s) => s.format === '9max').length).toBe(8 + 36 * 3);
  });
  it('has distributions per class', () => {
    for (const s of all) {
      for (let i = 0; i < 169; i++) {
        const sum = s.strategy.reduce((t, a) => t + a[i]!, 0);
        expect(sum).toBeCloseTo(1, 5);
      }
    }
  });
  it('sets up the table', () => {
    const s = preflopSpot('6max/vsRFI/BB/BTN')!;
    expect(s.history.map((h) => `${h.pos}:${h.kind}`)).toEqual(['UTG:fold', 'HJ:fold', 'CO:fold', 'BTN:raise', 'SB:fold']);
    expect(s.pot).toBe(4);
    expect(s.toCall).toBe(1.5);
    expect(s.actions.map((a) => a.label)).toEqual(['Fold', 'Call', '3-Bet 11']);
    const v3 = preflopSpot('6max/vs3B/CO/BTN')!;
    expect(v3.history.map((h) => `${h.pos}:${h.kind}${h.to ?? ''}`)).toEqual(['UTG:fold', 'HJ:fold', 'CO:raise2.5', 'BTN:raise7.5', 'SB:fold', 'BB:fold']);
    expect(v3.pot).toBe(11.5);
    expect(v3.toCall).toBe(5);
    const v4 = preflopSpot('6max/vs4B/BB/SB')!;
    expect(v4.history.map((h) => `${h.pos}:${h.kind}${h.to ?? ''}`)).toEqual(['UTG:fold', 'HJ:fold', 'CO:fold', 'BTN:fold', 'SB:raise3', 'BB:raise9', 'SB:raise22']);
    expect(v4.pot).toBe(31);
  });
  it('maps 9-max late spots onto 6-max', () => {
    const a = preflopSpot('9max/RFI/LJ')!;
    const b = preflopSpot('6max/RFI/UTG')!;
    expect(a.source).toBe('mapped');
    expect(Array.from(a.strategy[1]!)).toEqual(Array.from(b.strategy[1]!));
    expect(preflopSpot('9max/RFI/UTG')!.source).toBe('chart');
  });
  it('conditions vs3B on the open', () => {
    const s = preflopSpot('6max/vs3B/UTG/BTN')!;
    expect(s.reach[0]).toBe(1); // AA opens
    expect(freqsOf(s, 'AA')[0]).toBe(0);
    const t = actionTotals(preflopSpot('6max/RFI/BTN')!);
    expect(t[1]).toBeGreaterThan(0.4);
  });
});
