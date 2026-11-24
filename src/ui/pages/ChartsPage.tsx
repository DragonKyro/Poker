// Every preflop chart: pick the table, the situation, your seat and the
// other player's, and study the grid. "Drill it" opens the drill on that seat.

import { FORMAT_NAME, SEATS, type Format, type Position } from '@/poker/positions';
import { SPOT_TYPES, SPOT_TYPE_BLURB, SPOT_TYPE_NAME, preflopSpot, spotTitle } from '@/preflop/spots';
import type { SpotType } from '@/preflop/types';
import { usePrefs } from '@/store/prefsStore';
import { accuracy, useProgress } from '@/store/progressStore';
import { PreflopRange } from '../grid/PreflopRange';
import { go, paths } from '../router';
import { Icon } from '../shared/Icon';
import { TopBar } from '../shared/Settings';

const P = (p: Position) => (p === 'UTG1' ? 'UTG+1' : p === 'UTG2' ? 'UTG+2' : p);

function heroesFor(format: Format, type: SpotType): Position[] {
  const s = SEATS[format];
  if (type === 'RFI' || type === 'vs3B') return s.filter((p) => p !== 'BB');
  return s.slice(1);
}

function villainsFor(format: Format, type: SpotType, hero: Position): Position[] {
  const s = SEATS[format];
  const i = s.indexOf(hero);
  if (type === 'RFI') return [];
  if (type === 'vs3B') return s.slice(i + 1);
  return s.slice(0, i);
}

function parse(id: string | null): { format: Format; type: SpotType; hero: Position; villain: Position | null } {
  const [f, t, h, v] = (id ?? '').split('/');
  const format: Format = f === '9max' ? '9max' : '6max';
  const type: SpotType = (SPOT_TYPES as readonly string[]).includes(t ?? '') ? (t as SpotType) : 'RFI';
  const heroes = heroesFor(format, type);
  const hero = heroes.includes(h as Position) ? (h as Position) : heroes[0]!;
  const vs = villainsFor(format, type, hero);
  const villain = type === 'RFI' ? null : vs.includes(v as Position) ? (v as Position) : type === 'vs3B' ? vs[vs.length - 1]! : vs[vs.length - 1]!;
  return { format, type, hero, villain };
}

const idOf = (x: { format: Format; type: SpotType; hero: Position; villain: Position | null }) => (x.type === 'RFI' ? `${x.format}/RFI/${x.hero}` : `${x.format}/${x.type}/${x.hero}/${x.villain}`);

export function ChartsPage({ spot: spotId }: { spot: string | null }) {
  const sel = parse(spotId);
  const spot = preflopSpot(idOf(sel))!;
  const stats = useProgress((s) => s.totals.spots[`pf:${spot.id}`]);
  const setPrefs = usePrefs((s) => s.set);
  const setup = usePrefs((s) => s.preflop);
  const nav = (p: Partial<typeof sel>) => {
    const n = { ...sel, ...p };
    const heroes = heroesFor(n.format, n.type);
    if (!heroes.includes(n.hero)) n.hero = heroes[0]!;
    const vs = villainsFor(n.format, n.type, n.hero);
    n.villain = n.type === 'RFI' ? null : n.villain && vs.includes(n.villain) ? n.villain : vs[vs.length - 1]!;
    go(paths.charts(idOf(n)), true);
  };
  const acc = accuracy(stats);

  return (
    <div className="page charts-page">
      <TopBar kicker={`Range charts · ${FORMAT_NAME[sel.format]}`} title={spotTitle(spot)} />
      <div className="charts-layout">
        <div className="charts-controls panel">
          <div className="setup-group">
            <div className="setup-h">Table</div>
            <div className="pill-row">
              {(['6max', '9max'] as const).map((f) => (
                <button key={f} type="button" className="pill" aria-pressed={sel.format === f} onClick={() => nav({ format: f })}>
                  {FORMAT_NAME[f]}
                </button>
              ))}
            </div>
          </div>
          <div className="setup-group">
            <div className="setup-h">Situation</div>
            <div className="tabs">
              {SPOT_TYPES.map((t) => (
                <button key={t} type="button" className="tab" aria-pressed={sel.type === t} onClick={() => nav({ type: t })} title={SPOT_TYPE_BLURB[t]}>
                  {SPOT_TYPE_NAME[t]}
                </button>
              ))}
            </div>
          </div>
          <div className="setup-group">
            <div className="setup-h">You</div>
            <div className="pill-row">
              {heroesFor(sel.format, sel.type).map((p) => (
                <button key={p} type="button" className="pill" aria-pressed={sel.hero === p} onClick={() => nav({ hero: p })}>
                  {P(p)}
                </button>
              ))}
            </div>
          </div>
          {sel.type !== 'RFI' && (
            <div className="setup-group">
              <div className="setup-h">{sel.type === 'vs3B' ? '3-bettor' : 'Opener'}</div>
              <div className="pill-row">
                {villainsFor(sel.format, sel.type, sel.hero).map((p) => (
                  <button key={p} type="button" className="pill" aria-pressed={sel.villain === p} onClick={() => nav({ villain: p })}>
                    {P(p)}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="charts-meta">
            {spot.source === 'mapped' && <p className="faint small">Same as the 6-max chart with LJ in UTG’s seat — the same number of players left behind.</p>}
            {acc !== null && (
              <p className="small">
                Your accuracy here: <b className="num">{Math.round(acc * 100)}%</b> <span className="faint num">over {stats!.n} hands</span>
              </p>
            )}
            <button
              type="button"
              className="btn"
              onClick={() => {
                setPrefs({ preflop: { ...setup, format: sel.format, types: [sel.type], heroes: [sel.hero] } });
                go(paths.preflop);
              }}
            >
              <Icon name="play" size="sm" /> Drill {P(sel.hero)} · {SPOT_TYPE_NAME[sel.type].toLowerCase()}
            </button>
          </div>
        </div>
        <div className="charts-main panel">
          <PreflopRange key={spot.id} spot={spot} />
        </div>
      </div>
    </div>
  );
}
