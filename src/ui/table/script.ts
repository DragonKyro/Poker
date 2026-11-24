// A hand as a script of table events, and what the table shows after the
// first k of them. Pure, so the drill pages just say what happened and the
// table animates it: the blinds posted, each action in turn, the bets swept
// into the pot, the board dealt, then the hero to act.

import type { Card } from '@/poker/cards';
import { SEATS, STACK_BB, type Format, type Position } from '@/poker/positions';
import type { SeatView, TableView } from './PokerTable';

export type ActKind = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin';

export type TableEvent =
  | { t: 'deal' }
  | { t: 'act'; pos: Position; kind: ActKind; to?: number; label: string }
  | { t: 'collect' }
  | { t: 'board'; cards: Card[] }
  | { t: 'hero' };

export interface Scene {
  format: Format;
  hero: Position;
  heroCards: readonly Card[];
  /** Seats that never get cards (postflop spots show only the two players' hands). */
  sittingOut?: readonly Position[];
  events: TableEvent[];
  handKey: string;
  watermark?: string;
}

export function tableAt(scene: Scene, k: number, dealMs: number): TableView & { heroTurn: boolean } {
  const seats = SEATS[scene.format];
  const state = new Map<Position, SeatView>();
  for (const pos of seats) {
    const blind = pos === 'SB' ? 0.5 : pos === 'BB' ? 1 : 0;
    const out = scene.sittingOut?.includes(pos) ?? false;
    state.set(pos, {
      pos,
      stack: STACK_BB - blind,
      bet: blind,
      folded: out,
      cards: out ? null : pos === scene.hero ? scene.heroCards : 'backs',
    });
  }
  let pot = 0;
  let board: Card[] = [];
  let collecting = false;
  let street = 0;
  let heroTurn = false;
  const evs = scene.events.slice(0, k);
  evs.forEach((e, idx) => {
    const last = idx === evs.length - 1;
    if (collecting) {
      // finish the sweep
      for (const s of state.values()) {
        pot += s.bet;
        s.bet = 0;
        if (!s.folded) s.tag = undefined;
      }
      collecting = false;
      street++;
    }
    switch (e.t) {
      case 'act': {
        const s = state.get(e.pos)!;
        if (e.kind === 'fold') {
          s.folded = true;
          s.cards = null;
        } else if (e.to !== undefined && e.kind !== 'check') {
          const add = Math.max(0, e.to - s.bet);
          s.stack = Math.max(0, s.stack - add);
          s.bet = e.to;
        }
        s.tag = e.label;
        s.tagKind = e.kind;
        break;
      }
      case 'collect':
        if (last) collecting = true;
        else {
          for (const s of state.values()) {
            pot += s.bet;
            s.bet = 0;
            if (!s.folded) s.tag = undefined;
          }
          street++;
        }
        break;
      case 'board':
        board = e.cards;
        break;
      case 'hero':
        heroTurn = true;
        break;
      case 'deal':
        break;
    }
  });
  const seatsOut = seats.map((p) => ({ ...state.get(p)!, acting: heroTurn && p === scene.hero }));
  return {
    seats: seatsOut,
    hero: scene.hero,
    pot,
    board,
    handKey: scene.handKey,
    streetKey: String(street),
    collecting,
    dealMs,
    watermark: scene.watermark,
    heroTurn,
  };
}

/** How long to wait after event `e` before showing the next. */
export function eventDelay(e: TableEvent, step: number, dealMs: number, seats: number): number {
  switch (e.t) {
    case 'deal':
      return seats * 2 * dealMs + 380;
    case 'act':
      return e.kind === 'fold' ? step * 0.6 : step;
    case 'collect':
      return 420;
    case 'board':
      return e.cards.length >= 3 ? 720 : 420;
    case 'hero':
      return 0;
  }
}

const fmt = (x: number) => (Math.abs(x - Math.round(x)) < 0.05 ? String(Math.round(x)) : x.toFixed(1));

/** Labels for a preflop raise sequence: the open, then 3-bet, 4-bet… */
export function raiseLabel(nth: number, to: number): string {
  return nth === 1 ? `Raise ${fmt(to)}` : `${nth + 1}-Bet ${fmt(to)}`;
}

export { fmt as fmtBB };
