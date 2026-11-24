// Cards as small integers, so the solver can index arrays with them:
// card = rank * 4 + suit, rank 0..12 = 2..A, suit 0..3 = c d h s.
// Text form is the usual poker notation: 'As', 'Td', '7c'.

export type Card = number;
export type Suit = 0 | 1 | 2 | 3;

export const RANKS = '23456789TJQKA';
export const SUITS = 'cdhs';
export const SUIT_SYMBOL = ['♣', '♦', '♥', '♠'] as const;
export const SUIT_NAME = ['clubs', 'diamonds', 'hearts', 'spades'] as const;
export const RANK_NAME = ['Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Jack', 'Queen', 'King', 'Ace'] as const;

export const rankOf = (c: Card): number => c >> 2;
export const suitOf = (c: Card): Suit => (c & 3) as Suit;
export const makeCard = (rank: number, suit: number): Card => rank * 4 + suit;

export function parseCard(s: string): Card {
  const r = RANKS.indexOf(s[0]!.toUpperCase());
  const u = SUITS.indexOf(s[1]!.toLowerCase());
  if (r < 0 || u < 0 || s.length !== 2) throw new Error(`bad card "${s}"`);
  return r * 4 + u;
}

export function cardStr(c: Card): string {
  return RANKS[rankOf(c)]! + SUITS[suitOf(c)]!;
}

/** 'AsKd7c' or 'As Kd 7c' → cards. */
export function parseCards(s: string): Card[] {
  const t = s.replace(/[\s,]/g, '');
  const out: Card[] = [];
  for (let i = 0; i < t.length; i += 2) out.push(parseCard(t.slice(i, i + 2)));
  return out;
}

export function cardLabel(c: Card): string {
  return `${RANK_NAME[rankOf(c)]} of ${SUIT_NAME[suitOf(c)]}`;
}

/** A fresh 52-card deck. */
export const DECK: readonly Card[] = Array.from({ length: 52 }, (_, i) => i);
