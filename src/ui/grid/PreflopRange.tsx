// A preflop chart: the grid, its legend (share of the range taking each
// action), and the numbers for the cell under the pointer.

import { useMemo, useState } from 'react';
import { CLASS_INDEX, HAND_CLASSES, comboCount } from '@/poker/hands';
import { actionTotals } from '@/preflop/spots';
import type { PreflopSpot } from '@/preflop/types';
import { actionColors } from './colors';
import { RangeGrid, StrategyBar, type GridData } from './RangeGrid';

export function usePreflopGrid(spot: PreflopSpot): GridData {
  return useMemo(() => ({ freqs: spot.strategy, reach: spot.reach, colors: actionColors(spot.actions) }), [spot]);
}

export function PreflopRange({ spot, highlight, showNote = true }: { spot: PreflopSpot; highlight?: string; showNote?: boolean }) {
  const data = usePreflopGrid(spot);
  const hi = highlight ? CLASS_INDEX.get(highlight) : undefined;
  const [sel, setSel] = useState<number | null>(null);
  const shown = sel ?? hi ?? null;
  const totals = useMemo(() => actionTotals(spot), [spot]);
  const inRange = useMemo(() => {
    let n = 0;
    for (let i = 0; i < 169; i++) n += spot.reach[i]! * comboCount(HAND_CLASSES[i]!);
    return n;
  }, [spot]);
  const labels = spot.actions.map((a) => a.label);
  return (
    <div className="pf-range">
      <div className="range-cap">
        <b>Whole range</b>
        <span className="faint">how all {Math.round(inRange)} combos that reach this spot play</span>
      </div>
      <StrategyBar labels={labels} freqs={totals} colors={data.colors} />
      <div className="pf-range-grid" onPointerLeave={() => setSel(null)}>
        <RangeGrid data={data} highlight={hi} selected={sel} onPick={setSel} />
      </div>
      <div className="cell-info">
        {shown !== null ? (
          <>
            <span className="cell-info-tag">{sel === null && shown === hi ? 'Your hand' : 'Hand'}</span>
            <b className="cell-info-hand">{HAND_CLASSES[shown]}</b>
            {spot.reach[shown]! < 0.004 ? (
              <span className="faint">Not in range here</span>
            ) : (
              <span className="cell-info-mix">
                {spot.actions.map((a, k) => {
                  const f = spot.strategy[k]![shown]!;
                  return f > 0.004 ? (
                    <span key={k} className="cell-info-act">
                      <i style={{ background: data.colors[k] }} />
                      {a.label} <b className="num">{Math.round(f * 100)}%</b>
                    </span>
                  ) : null;
                })}
                {spot.reach[shown]! < 0.995 && <span className="faint num">in range {Math.round(spot.reach[shown]! * 100)}%</span>}
              </span>
            )}
          </>
        ) : (
          <span className="faint num">
            {Math.round(inRange)} combos ({((inRange / 1326) * 100).toFixed(1)}% of hands) reach this spot
          </span>
        )}
      </div>
      {showNote && spot.note && <p className="spot-note">{spot.note}</p>}
    </div>
  );
}
