import { mergeDevice, streak, today, totalsOf, type DeviceProgress } from './progressStore';

const dev = (over: Partial<DeviceProgress>): DeviceProgress => ({ spots: {}, days: {}, misses: {}, at: 0, ...over });

describe('progress merging', () => {
  it('sums devices and keeps the newest miss state', () => {
    const a = dev({ spots: { s: { n: 3, pts: 2, best: 1, ev: 0.5, at: 10 } }, days: { '2026-11-20': 3 }, misses: { 'pf:x|AKo': 100, 'pf:x|72o': 50 } });
    const b = dev({ spots: { s: { n: 2, pts: 2, best: 2, ev: 0, at: 20 } }, days: { '2026-11-20': 1 }, misses: { 'pf:x|AKo': -200 } });
    const t = totalsOf([a, b]);
    expect(t.spots.s).toEqual({ n: 5, pts: 4, best: 3, ev: 0.5, at: 20 });
    expect(t.days['2026-11-20']).toBe(4);
    // AKo was cleared later on device b; 72o is still open
    expect(t.misses.map((m) => m.key)).toEqual(['pf:x|72o']);
  });
  it('merges two copies of one device by the larger counters', () => {
    const old = dev({ spots: { s: { n: 2, pts: 1, best: 0, ev: 0, at: 1 } }, days: { d: 2 } });
    const cur = dev({ spots: { s: { n: 5, pts: 4, best: 3, ev: 0, at: 9 } }, days: { d: 5 } });
    const m = mergeDevice(old, cur);
    expect(m.spots.s!.n).toBe(5);
    expect(m.days.d).toBe(5);
    expect(mergeDevice(cur, old).spots.s!.n).toBe(5);
  });
  it('counts a streak ending today or yesterday', () => {
    const d = new Date();
    const days: Record<string, number> = {};
    for (let i = 1; i <= 3; i++) {
      const x = new Date(d);
      x.setDate(d.getDate() - i);
      days[today(x)] = 1;
    }
    expect(streak(days)).toBe(3);
    days[today(d)] = 2;
    expect(streak(days)).toBe(4);
  });
});
