// The bottom of a drill: the action buttons while the hero thinks, then the
// verdict — how GTO plays this hand, what you chose, and the next hand.

import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { VERDICT_NAME, type Grade } from '@/train/grade';
import { Icon } from '../shared/Icon';
import { StrategyBar } from '../grid/RangeGrid';

export interface ButtonSpec {
  label: string;
  sub?: string;
  color: string;
  /** Keyboard shortcut (one letter). */
  key?: string;
}

/** Shortcut letters: F fold, C call / X check, R / B raise or bet (then 1–9), A all-in. */
export function shortcutFor(kind: string, used: Set<string>): string | undefined {
  const pref = kind === 'fold' ? 'f' : kind === 'call' ? 'c' : kind === 'check' ? 'x' : kind === 'allin' ? 'a' : kind === 'raise' ? 'r' : 'b';
  if (!used.has(pref)) {
    used.add(pref);
    return pref;
  }
  return undefined;
}

export function ActionBar({ buttons, onAct, disabled, roll }: { buttons: ButtonSpec[]; onAct: (i: number) => void; disabled: boolean; roll?: number }) {
  useEffect(() => {
    if (disabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      const byKey = buttons.findIndex((b) => b.key === k);
      const byNum = /^[1-9]$/.test(k) ? Number(k) - 1 : -1;
      const i = byKey >= 0 ? byKey : byNum < buttons.length ? byNum : -1;
      if (i >= 0) {
        e.preventDefault();
        onAct(i);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [buttons, onAct, disabled]);

  return (
    <div className={`action-bar${disabled ? ' is-waiting' : ''}`}>
      {roll !== undefined && (
        <span className="rng-badge" title="Random number for mixed strategies">
          <Icon name="dice" size="sm" />
          <b className="num">{roll + 1}</b>
        </span>
      )}
      <div className="action-buttons" style={{ '--n': buttons.length } as CSSProperties}>
        {buttons.map((b, i) => (
          <button key={i} type="button" className="act-btn" style={{ '--c': b.color, '--i': i } as CSSProperties} disabled={disabled} onClick={() => onAct(i)}>
            <span className="act-label">{b.label}</span>
            {b.sub && <span className="act-sub num">{b.sub}</span>}
            {b.key && <span className="kbd act-kbd">{b.key.toUpperCase()}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Feedback({
  grade,
  labels,
  colors,
  freqs,
  chosen,
  evs,
  hand,
  detail,
  onNext,
  onRange,
  roll,
}: {
  grade: Grade;
  labels: string[];
  colors: string[];
  freqs: readonly number[];
  chosen: number;
  evs?: readonly number[];
  hand: ReactNode;
  detail?: ReactNode;
  onNext: () => void;
  onRange?: () => void;
  roll?: number;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        onNext();
      }
    };
    // Don't let the keypress that answered also skip ahead.
    const id = window.setTimeout(() => window.addEventListener('keydown', onKey), 250);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('keydown', onKey);
    };
  }, [onNext]);

  const v = grade.verdict;
  const good = v === 'best' || v === 'good';
  return (
    <div className={`feedback verdict-${v}`}>
      <div className="fb-head">
        <span className="fb-badge">
          <Icon name={good ? 'check' : 'cross'} />
          {VERDICT_NAME[v]}
        </span>
        <span className="fb-hand">{hand}</span>
        {grade.evLoss !== undefined && grade.evLoss > 0.005 && grade.freq < 0.1 && (
          <span className="fb-ev num" title="EV given up against the best action">
            −{grade.evLoss.toFixed(2)} bb{grade.evLossPot !== undefined ? ` · ${(grade.evLossPot * 100).toFixed(1)}% pot` : ''}
          </span>
        )}
      </div>
      <StrategyBar labels={labels} freqs={freqs} colors={colors} chosen={chosen} target={roll !== undefined ? grade.target : undefined} evs={evs} />
      {roll !== undefined && (
        <p className="fb-roll">
          Roll <b className="num">{roll + 1}</b> → <b>{labels[grade.target]}</b>
        </p>
      )}
      {detail}
      <div className="fb-buttons">
        {onRange && (
          <button type="button" className="btn btn-ghost" onClick={onRange}>
            <Icon name="grid" size="sm" /> Range
          </button>
        )}
        <button type="button" className="btn fb-next" onClick={onNext}>
          Next hand <Icon name="next" size="sm" />
          <span className="kbd">Space</span>
        </button>
      </div>
    </div>
  );
}
