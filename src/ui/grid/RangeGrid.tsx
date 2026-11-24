// The 13 × 13 hand grid. Each cell is split into bands by how often the hand
// takes each action (left to right in action order), and filled to the height
// of how often the hand is in the range here — a hand that only reaches the
// spot half the time fills half the cell. Tap / hover a cell for its numbers.

import { memo, type CSSProperties } from 'react';
import { HAND_CLASSES } from '@/poker/hands';

export interface GridData {
  /** freqs[action][class] */
  freqs: ArrayLike<number>[];
  /** reach[class], 0..1 */
  reach: ArrayLike<number>;
  colors: string[];
}

function Cell({ i, data, active, onPick }: { i: number; data: GridData; active: boolean; onPick?: (i: number) => void }) {
  const reach = Math.min(1, data.reach[i] ?? 0);
  const h = HAND_CLASSES[i]!;
  const bands: Array<[string, number]> = [];
  for (let a = 0; a < data.freqs.length; a++) {
    const f = data.freqs[a]![i] ?? 0;
    if (f > 0.004) bands.push([data.colors[a]!, f]);
  }
  const out = reach < 0.004;
  const cls = `rg-cell${h.length === 2 ? ' is-pair' : h[2] === 's' ? ' is-suited' : ''}${out ? ' is-out' : ''}${active ? ' is-active' : ''}`;
  return (
    <button type="button" className={cls} onPointerEnter={() => onPick?.(i)} onClick={() => onPick?.(i)} aria-label={h}>
      {!out && (
        <span className="rg-fill" style={{ height: `${Math.max(reach, 0.06) * 100}%` }}>
          {bands.map(([c, f], k) => (
            <span key={k} style={{ flexGrow: f, background: c } as CSSProperties} />
          ))}
        </span>
      )}
      <span className="rg-label">{h}</span>
    </button>
  );
}

export const RangeGrid = memo(function RangeGrid({
  data,
  highlight,
  selected,
  onPick,
  className,
}: {
  data: GridData;
  /** Class index to ring (the hero's hand). */
  highlight?: number;
  /** Class index being inspected. */
  selected?: number | null;
  onPick?: (i: number) => void;
  className?: string;
}) {
  return (
    <div className={`range-grid${className ? ` ${className}` : ''}`} role="grid" aria-label="Range">
      {HAND_CLASSES.map((_, i) => (
        <Cell key={i} i={i} data={data} active={i === highlight} onPick={onPick} />
      ))}
      {selected != null && <span className="rg-select" style={{ '--r': Math.floor(selected / 13), '--c': selected % 13 } as CSSProperties} aria-hidden />}
    </div>
  );
});

/** A horizontal bar of action frequencies with labels under it. */
export function StrategyBar({
  labels,
  freqs,
  colors,
  chosen,
  target,
  evs,
  compact,
}: {
  labels: string[];
  freqs: readonly number[];
  colors: string[];
  chosen?: number;
  target?: number;
  evs?: readonly (number | undefined)[];
  compact?: boolean;
}) {
  return (
    <div className={`sbar${compact ? ' is-compact' : ''}`}>
      <div className="sbar-track">
        {freqs.map((f, a) =>
          f > 0.004 ? (
            <span key={a} className={`sbar-seg${a === chosen ? ' is-chosen' : ''}`} style={{ flexGrow: f, background: colors[a] }}>
              {f >= 0.12 && !compact && <b>{Math.round(f * 100)}%</b>}
            </span>
          ) : null,
        )}
      </div>
      {!compact && (
        <div className="sbar-legend">
          {labels.map((l, a) => (
            <span key={a} className={`sbar-key${a === chosen ? ' is-chosen' : ''}${a === target ? ' is-target' : ''}`}>
              <i style={{ background: colors[a] }} />
              <span className="sbar-name">{l}</span>
              <span className="sbar-pct num">{Math.round((freqs[a] ?? 0) * 100)}%</span>
              {evs?.[a] !== undefined && <span className="sbar-ev num">{evs[a]! >= 0 ? '' : '−'}{Math.abs(evs[a]!).toFixed(2)}</span>}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
