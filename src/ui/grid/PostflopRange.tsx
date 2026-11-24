// A flop decision's whole strategy: overall frequencies, the hand grid, how
// each hand category plays, and the exact combos (with EVs) of a class.

import { useMemo, useState, type CSSProperties } from 'react';
import { COMBO_CLASS, HAND_CLASSES } from '@/poker/hands';
import { BUCKET_NAME } from '@/poker/madeHand';
import type { SolvedFlop, SolvedNode } from '@/postflop/types';
import { bucketRows, classCombos, classGrid, nodeTotals } from '@/postflop/view';
import { CardsText } from '../shared/text';
import { actionColors } from './colors';
import { RangeGrid, StrategyBar } from './RangeGrid';
import { actionName } from './labels';

/** `wide`: grid and hand types side by side (no tabs), for the board lab on big screens. */
export function PostflopRange({ data, node, heroCombo, wide }: { data: SolvedFlop; node: SolvedNode; heroCombo?: number; wide?: boolean }) {
  const colors = useMemo(() => actionColors(node.actions), [node]);
  const grid = useMemo(() => ({ ...classGrid(data, node), colors }), [data, node, colors]);
  const totals = useMemo(() => nodeTotals(data, node), [data, node]);
  const rows = useMemo(() => bucketRows(data, node), [data, node]);
  const heroCls = heroCombo !== undefined ? COMBO_CLASS[heroCombo]! : undefined;
  const [sel, setSel] = useState<number | null>(null);
  const shown = sel ?? heroCls ?? null;
  const combos = useMemo(() => (shown !== null ? classCombos(data, node, shown) : []), [data, node, shown]);
  const labels = node.actions.map((a) => actionName(a));
  const [tab, setTab] = useState<'grid' | 'hands'>('grid');

  const gridBlock = (
    <>
      <div className="pf-range-grid">
        <RangeGrid data={grid} highlight={heroCls} selected={sel} onPick={setSel} />
      </div>
      <div className="combo-list">
        {shown !== null && (
          <>
            <div className="combo-list-h">
              <span className="cell-info-tag">{sel === null && shown === heroCls ? 'Your hand' : 'Hand'}</span>
              <b>{HAND_CLASSES[shown]}</b>
              <span className="faint">{combos.filter((c) => c.reach > 0.004).length ? 'combos here · EV of the best play' : 'not in range here'}</span>
            </div>
            {combos
              .filter((c) => c.reach > 0.004)
              .map((c, i) => {
                const best = Math.max(...c.evs.filter((_, k) => c.freqs[k]! > 0.001));
                return (
                  <div key={i} className={`combo-row${heroCombo !== undefined && sameCombo(c.cards, heroCombo) ? ' is-hero' : ''}`}>
                    <CardsText cards={c.cards} />
                    <span className="combo-bar">
                      {c.freqs.map((f, k) => (f > 0.004 ? <span key={k} style={{ flexGrow: f, background: colors[k] } as CSSProperties} /> : null))}
                    </span>
                    <span className="combo-ev num" title="EV of the best action from here, bb">
                      {best.toFixed(2)}
                    </span>
                  </div>
                );
              })}
          </>
        )}
      </div>
    </>
  );
  const bucketBlock = (
    <div className="bucket-list">
      {rows.map((r) => (
        <div key={r.bucket} className="bucket-row">
          <span className="bucket-name">
            {BUCKET_NAME[r.bucket]}
            <span className="faint num"> {Math.round(r.share * 100)}%</span>
          </span>
          <span className="combo-bar bucket-bar">
            {r.freqs.map((f, k) =>
              f > 0.004 ? (
                <span key={k} style={{ flexGrow: f, background: colors[k] } as CSSProperties}>
                  {f >= 0.18 && <b>{Math.round(f * 100)}</b>}
                </span>
              ) : null,
            )}
          </span>
        </div>
      ))}
    </div>
  );

  if (wide) {
    return (
      <div className="po-range is-wide">
      <div className="range-cap">
        <b>Whole range</b>
        <span className="faint">how every hand the {node.player === 0 ? 'out-of-position' : 'in-position'} player can have here plays</span>
      </div>
        <StrategyBar labels={labels} freqs={totals} colors={colors} />
        <div className="po-wide">
          <div className="po-wide-col">{gridBlock}</div>
          <div className="po-wide-col">
            <h4>By hand type</h4>
            {bucketBlock}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="po-range">
      <div className="range-cap">
        <b>Whole range</b>
        <span className="faint">how every hand the {node.player === 0 ? 'out-of-position' : 'in-position'} player can have here plays</span>
      </div>
      <StrategyBar labels={labels} freqs={totals} colors={colors} />
      <div className="tabs tabs-sm">
        <button type="button" className="tab" aria-pressed={tab === 'grid'} onClick={() => setTab('grid')}>
          Range
        </button>
        <button type="button" className="tab" aria-pressed={tab === 'hands'} onClick={() => setTab('hands')}>
          By hand type
        </button>
      </div>
      {tab === 'grid' ? gridBlock : bucketBlock}
    </div>
  );
}

function sameCombo(cards: readonly number[], combo: number): boolean {
  const hi = Math.max(cards[0]!, cards[1]!);
  const lo = Math.min(cards[0]!, cards[1]!);
  return (hi * (hi - 1)) / 2 + lo === combo;
}
