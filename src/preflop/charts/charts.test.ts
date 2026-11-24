// Every chart parses, no class is over-assigned, every required chart exists,
// and the premium hands never fold.

import { CLASS_INDEX } from '@/poker/hands';
import { parseRange, rangePct } from '@/poker/range';
import type { ChartBook } from '../types';
import { NINE_MAX_KEYS, SIX_MAX_KEYS } from './keys';
import { NINE_MAX } from './nineMax';
import { SIX_MAX } from './sixMax';

const books: Array<[string, ChartBook, readonly string[]]> = [
  ['6-max', SIX_MAX, SIX_MAX_KEYS],
  ['9-max', NINE_MAX, NINE_MAX_KEYS],
];

describe.each(books)('%s charts', (_name, book, keys) => {
  it('has every required chart and nothing else', () => {
    expect(Object.keys(book).sort()).toEqual([...keys].sort());
  });

  it.each(keys.map((k) => [k]))('%s parses and sums to at most 1 per class', (key) => {
    const c = book[key];
    if (!c) return;
    const parts = [c.raise, c.call, c.allin].filter((x): x is string => x !== undefined).map(parseRange);
    for (let i = 0; i < 169; i++) {
      const sum = parts.reduce((s, r) => s + r[i]!, 0);
      expect(sum, `class #${i} in ${key}`).toBeLessThanOrEqual(1 + 1e-9);
    }
    const kind = key.split('/')[0];
    if (kind === 'RFI') expect(c.call).toBeUndefined();
    if (kind === 'vs4B') expect(c.raise).toBeUndefined();
    // AA and KK never fold.
    for (const h of ['AA', 'KK']) {
      const i = CLASS_INDEX.get(h)!;
      expect(parts.reduce((s, r) => s + r[i]!, 0), `${h} in ${key}`).toBeGreaterThan(0.999);
    }
  });

  it('opens a sensible share of hands', () => {
    for (const key of keys.filter((k) => k.startsWith('RFI/'))) {
      const pct = rangePct(parseRange(book[key]?.raise ?? ''));
      expect(pct, key).toBeGreaterThan(0.08);
      expect(pct, key).toBeLessThan(0.6);
    }
  });
});
