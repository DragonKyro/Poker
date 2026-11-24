// Inline text helpers: cards with coloured suits, bb amounts, percentages.

import { RANKS, SUIT_SYMBOL, rankOf, suitOf, type Card } from '@/poker/cards';

const SUIT_CLASS = ['suit-C', 'suit-D', 'suit-H', 'suit-S'] as const;

export function CardText({ card }: { card: Card }) {
  return (
    <span className="card-text">
      {RANKS[rankOf(card)]}
      <span className={`suit ${SUIT_CLASS[suitOf(card)]}`}>{SUIT_SYMBOL[suitOf(card)]}</span>
    </span>
  );
}

export function CardsText({ cards }: { cards: readonly Card[] }) {
  return (
    <span className="cards-text">
      {cards.map((c) => (
        <CardText key={c} card={c} />
      ))}
    </span>
  );
}

/** '2.5', '11', '97.5' — bb without trailing zeros. */
export const bb = (x: number): string => (Math.abs(x - Math.round(x)) < 0.05 ? String(Math.round(x)) : x.toFixed(1));

export const pct = (x: number, digits = 0): string => `${(x * 100).toFixed(digits)}%`;
