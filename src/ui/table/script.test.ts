import { parseCards } from '@/poker/cards';
import { tableAt, type Scene } from './script';

const scene: Scene = {
  format: '6max',
  hero: 'BB',
  heroCards: parseCards('AsKd'),
  handKey: 'h1',
  events: [
    { t: 'deal' },
    { t: 'act', pos: 'UTG', kind: 'fold', label: 'Fold' },
    { t: 'act', pos: 'HJ', kind: 'fold', label: 'Fold' },
    { t: 'act', pos: 'CO', kind: 'fold', label: 'Fold' },
    { t: 'act', pos: 'BTN', kind: 'raise', to: 2.5, label: 'Raise 2.5' },
    { t: 'act', pos: 'SB', kind: 'fold', label: 'Fold' },
    { t: 'act', pos: 'BB', kind: 'call', to: 2.5, label: 'Call' },
    { t: 'collect' },
    { t: 'board', cards: parseCards('Ks7d2c') },
    { t: 'act', pos: 'BB', kind: 'check', label: 'Check' },
    { t: 'act', pos: 'BTN', kind: 'bet', to: 1.8, label: 'Bet 1.8' },
    { t: 'hero' },
  ],
};

describe('tableAt', () => {
  it('starts with the blinds posted and cards out', () => {
    const v = tableAt(scene, 0, 50);
    const sb = v.seats.find((s) => s.pos === 'SB')!;
    const bb = v.seats.find((s) => s.pos === 'BB')!;
    expect(sb.bet).toBe(0.5);
    expect(bb.bet).toBe(1);
    expect(bb.stack).toBe(99);
    expect(bb.cards).toEqual(parseCards('AsKd'));
    expect(v.seats.find((s) => s.pos === 'UTG')!.cards).toBe('backs');
    expect(v.heroTurn).toBe(false);
  });
  it('plays the hand to the hero', () => {
    const atCollect = tableAt(scene, 8, 50);
    expect(atCollect.collecting).toBe(true);
    const v = tableAt(scene, scene.events.length, 50);
    expect(v.pot).toBe(5.5); // 2.5 + 2.5 + the folded SB's 0.5
    expect(v.board.length).toBe(3);
    const btn = v.seats.find((s) => s.pos === 'BTN')!;
    expect(btn.bet).toBe(1.8);
    expect(btn.stack).toBeCloseTo(95.7);
    expect(v.seats.find((s) => s.pos === 'SB')!.folded).toBe(true);
    expect(v.heroTurn).toBe(true);
    expect(v.seats.find((s) => s.pos === 'BB')!.acting).toBe(true);
  });
});
