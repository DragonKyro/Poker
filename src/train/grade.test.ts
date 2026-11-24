import { grade, rollAction } from './grade';

describe('grade', () => {
  it('grades by frequency', () => {
    expect(grade([0, 0.3, 0.7], 2).verdict).toBe('best');
    expect(grade([0, 0.4, 0.6], 1).verdict).toBe('best'); // ≥ 35%
    expect(grade([0, 0.2, 0.8], 1).verdict).toBe('good');
    expect(grade([0.05, 0.15, 0.8], 0).verdict).toBe('inaccuracy');
    expect(grade([0, 0, 1], 0, { edge: true }).verdict).toBe('mistake');
    expect(grade([0, 0, 1], 0, { edge: false }).verdict).toBe('blunder');
  });
  it('grades by the roll when the RNG is on', () => {
    // walking from the most aggressive: raise covers 0..59, call 60..99
    expect(rollAction([0, 0.4, 0.6], 10)).toBe(2);
    expect(rollAction([0, 0.4, 0.6], 75)).toBe(1);
    expect(grade([0, 0.4, 0.6], 2, { roll: 10 }).verdict).toBe('best');
    expect(grade([0, 0.4, 0.6], 1, { roll: 10 }).verdict).toBe('good');
    expect(grade([0, 0.4, 0.6], 0, { roll: 10, edge: true }).verdict).toBe('mistake');
  });
  it('lets EV soften or sharpen postflop verdicts', () => {
    // a 0% action that costs almost nothing is only an inaccuracy
    const cheap = grade([0.5, 0.5, 0], 2, { evs: [1.0, 1.0, 0.98], pot: 10 });
    expect(cheap.verdict).toBe('inaccuracy');
    expect(cheap.evLoss).toBeCloseTo(0.02);
    // a big loss is a blunder even near the edge
    expect(grade([1, 0, 0], 1, { edge: true, evs: [3, 1, 0], pot: 10 }).verdict).toBe('blunder');
    // the best action never loses EV
    expect(grade([0.2, 0.8], 1, { evs: [2, 2.1], pot: 5 }).evLoss).toBe(0);
  });
});
