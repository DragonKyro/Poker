// The table: an oval of felt with the seats on its rail, the hero at the
// bottom. Seats sit clockwise in preflop order (UTG … BB), as at a real
// table. Everything is placed in % of the table box and animated in
// container-query units (cqw / cqh), so a chip flies from the right seat to
// the right spot at any size:
//   - hole cards are dealt from the centre, one round at a time;
//   - a bet slides from its seat to the felt in front of it;
//   - a fold sends the cards to the muck and greys the seat;
//   - at the end of a street the bets sweep into the pot;
//   - board cards flip over one after another.

import { memo, type CSSProperties } from 'react';
import type { Card } from '@/poker/cards';
import type { Position } from '@/poker/positions';
import { CardView, FlipCard } from '../cards/CardView';
import { bb } from '../shared/text';

export interface SeatView {
  pos: Position;
  /** Chips behind. */
  stack: number;
  /** Chips in front this street. */
  bet: number;
  folded: boolean;
  /** Hero: face-up cards; others: backs; none once folded. */
  cards: readonly Card[] | 'backs' | null;
  /** Last action, shown as a tag ("Raise 2.5", "Fold"). */
  tag?: string;
  tagKind?: string;
  acting?: boolean;
}

export interface TableView {
  seats: SeatView[];
  hero: Position;
  /** Chips already in the middle (not the bets in front of players). */
  pot: number;
  board: readonly Card[];
  /** Changes with every new hand: replays the deal. */
  handKey: string;
  /** Changes when the bets are swept into the pot. */
  streetKey?: string;
  /** The bets are flying into the pot (the moment before a new street). */
  collecting?: boolean;
  /** Pace of the deal animation, ms per card. */
  dealMs: number;
  /** Text shown faintly on the felt. */
  watermark?: string;
}

const SEAT_RX = 44;
const SEAT_RY = 40.5;

function slot(seatIndex: number, heroIndex: number, n: number) {
  const k = (seatIndex - heroIndex + n) % n;
  const ang = ((90 + (k * 360) / n) * Math.PI) / 180;
  const cos = Math.cos(ang);
  const sin = Math.sin(ang);
  return {
    k,
    x: 50 + SEAT_RX * cos,
    y: 50 + SEAT_RY * sin,
    bx: 50 + SEAT_RX * 0.68 * cos,
    by: 50 + SEAT_RY * (k === 0 ? 0.42 : 0.58) * sin,
    // the dealer button: a little clockwise of the seat, towards the middle
    dx: 50 + SEAT_RX * 0.8 * Math.cos(ang + 0.24),
    dy: 50 + SEAT_RY * 0.78 * Math.sin(ang + 0.24),
  };
}

/** Chip denominations for a stack of `amount` bb: a few chips, colour by size. */
function chipsFor(amount: number): string[] {
  const out: string[] = [];
  const denoms: Array<[number, string]> = [
    [25, 'c-25'],
    [5, 'c-5'],
    [1, 'c-1'],
    [0.5, 'c-half'],
  ];
  let left = amount;
  for (const [v, cls] of denoms) {
    while (left >= v - 1e-9 && out.length < 7) {
      out.push(cls);
      left -= v;
    }
  }
  if (out.length === 0) out.push('c-half');
  return out;
}

export function ChipStack({ amount, className, style }: { amount: number; className?: string; style?: CSSProperties }) {
  const chips = chipsFor(amount);
  return (
    <span className={`chips${className ? ` ${className}` : ''}`} style={style} aria-hidden>
      {chips.map((c, i) => (
        <span key={i} className={`chip3d ${c}`} style={{ '--i': i } as CSSProperties} />
      ))}
    </span>
  );
}

export const PokerTable = memo(function PokerTable({ view }: { view: TableView }) {
  const n = view.seats.length;
  const hi = view.seats.findIndex((s) => s.pos === view.hero);
  const btn = view.seats.findIndex((s) => s.pos === 'BTN');
  const b = slot(btn, hi, n);
  // Deal order: starting left of the button, two rounds.
  const dealOrder = (i: number) => (i - ((btn + 1) % n) + n) % n;
  const total = view.pot + view.seats.reduce((s, x) => s + x.bet, 0);

  return (
    <div className={`table-wrap seats-${n}`}>
      <div className="felt-rail" aria-hidden />
      <div className="felt" aria-hidden>
        <div className="felt-texture" />
        <div className="felt-line" />
        {view.watermark && <div className="felt-mark">{view.watermark}</div>}
      </div>

      <div className="pot" key={`pot-${view.handKey}`}>
        {view.board.length > 0 && (
          <div className="board">
            {view.board.map((c, i) => (
              <FlipCard key={`${view.handKey}-${c}`} card={c} delay={i < 3 ? i * 140 : 0} className="board-card" />
            ))}
            {Array.from({ length: 5 - view.board.length }, (_, i) => (
              <span key={`slot${i}`} className="board-slot" />
            ))}
          </div>
        )}
        {total > 0 && (
          <div className="pot-amount" key={`p${view.streetKey ?? ''}`}>
            {view.pot > 0 && <ChipStack amount={view.pot} />}
            <span className="pot-label">
              Pot <b className="num">{bb(total)}</b>
            </span>
          </div>
        )}
      </div>

      <span className="dealer-btn" style={{ left: `${b.dx}%`, top: `${b.dy}%` }} aria-label="Dealer button">
        D
      </span>

      {view.seats.map((s, i) => {
        const p = slot(i, hi, n);
        const isHero = i === hi;
        const style = {
          left: `${p.x}%`,
          top: `${p.y}%`,
          '--fx': `${(50 - p.x).toFixed(2)}cqw`,
          '--fy': `${(50 - p.y).toFixed(2)}cqh`,
          '--d1': `${dealOrder(i) * view.dealMs}ms`,
          '--d2': `${(dealOrder(i) + n) * view.dealMs}ms`,
        } as CSSProperties;
        const betStyle = {
          left: `${p.bx}%`,
          top: `${p.by}%`,
          '--fx': `${(p.x - p.bx).toFixed(2)}cqw`,
          '--fy': `${(p.y - p.by).toFixed(2)}cqh`,
          '--px': `${(50 - p.bx).toFixed(2)}cqw`,
          '--py': `${(52 - p.by).toFixed(2)}cqh`,
        } as CSSProperties;
        return (
          <div key={s.pos}>
            <div className={`seat${isHero ? ' is-hero' : ''}${s.folded ? ' is-folded' : ''}${s.acting ? ' is-acting' : ''}${p.y < 50 ? ' is-top' : ''}`} style={style}>
              <div className="seat-cards" key={`${view.handKey}-${s.cards === null ? 'x' : 'c'}`}>
                {s.cards === 'backs' && (
                  <>
                    <CardView card={null} className="hole hole-1" />
                    <CardView card={null} className="hole hole-2" />
                  </>
                )}
                {Array.isArray(s.cards) && (
                  <>
                    <FlipCard card={s.cards[0]!} className="hole hole-1" delay={0} />
                    <FlipCard card={s.cards[1]!} className="hole hole-2" delay={60} />
                  </>
                )}
              </div>
              {s.folded && <div className="seat-muck" key={`m-${view.handKey}`} aria-hidden />}
              <div className="seat-plate">
                <span className="seat-pos">{s.pos === 'UTG1' ? 'UTG+1' : s.pos === 'UTG2' ? 'UTG+2' : s.pos}</span>
                <span className="seat-stack num">{bb(s.stack)}</span>
              </div>
              {s.tag && (
                <span className={`seat-tag tag-${s.tagKind ?? 'none'}`} key={s.tag}>
                  {s.tag}
                </span>
              )}
            </div>
            {s.bet > 0 && (
              <div className={`bet${view.collecting ? ' is-collecting' : ''}`} style={betStyle} key={`b-${view.handKey}-${view.streetKey ?? ''}-${s.bet}`}>
                <ChipStack amount={s.bet} />
                <span className="bet-amount num">{bb(s.bet)}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});
