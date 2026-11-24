// One playing card (art from cardArt). `card` null draws the back.

import type { CSSProperties } from 'react';
import { cardLabel, type Card } from '@/poker/cards';
import { usePrefs } from '@/store/prefsStore';
import { cardSrc, type CardLayout } from './cardArt';

export function CardImg({ card, layout = 'compact' }: { card: Card | null; layout?: CardLayout }) {
  const fourColor = usePrefs((s) => s.fourColor);
  return <img className="card-img" src={cardSrc(card, layout, fourColor ? 'four' : 'two')} alt={card === null ? 'card back' : cardLabel(card)} draggable={false} />;
}

export function CardView({ card, layout = 'compact', className, style }: { card: Card | null; layout?: CardLayout; className?: string; style?: CSSProperties }) {
  return (
    <span className={`card${className ? ` ${className}` : ''}`} style={style}>
      <CardImg card={card} layout={layout} />
    </span>
  );
}

/** A card that flips from its back to its face when mounted (the board, the hero's hand). */
export function FlipCard({ card, delay = 0, layout = 'compact', className, style }: { card: Card; delay?: number; layout?: CardLayout; className?: string; style?: CSSProperties }) {
  return (
    <span className={`card flip${className ? ` ${className}` : ''}`} style={{ ...style, '--delay': `${delay}ms` } as CSSProperties}>
      <span className="flip-inner">
        <span className="flip-face">
          <CardImg card={card} layout={layout} />
        </span>
        <span className="flip-back">
          <CardImg card={null} />
        </span>
      </span>
    </span>
  );
}
