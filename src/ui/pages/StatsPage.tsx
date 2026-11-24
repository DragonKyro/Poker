// Progress: totals and the last two weeks, accuracy by situation and seat
// (preflop) and by pot, decision and texture (flop), the weakest spots with
// a button to drill them, and the review queue.

import { useMemo, type CSSProperties } from 'react';
import { FAMILY_NAME, type Family } from '@/poker/texture';
import { NODE_KIND_NAME, postflopSpot, type NodeKind } from '@/postflop/spots';
import { SPOT_TYPE_NAME, preflopSpot, spotTitle } from '@/preflop/spots';
import type { SpotType } from '@/preflop/types';
import { usePrefs } from '@/store/prefsStore';
import { streak, today, useProgress, type SpotStat } from '@/store/progressStore';
import { go, paths } from '../router';
import { Icon } from '../shared/Icon';
import { TopBar } from '../shared/Settings';

const accOf = (s: { n: number; pts: number }) => (s.n ? s.pts / s.n : 0);

function add(into: Map<string, { n: number; pts: number; ev: number }>, key: string, s: SpotStat) {
  const x = into.get(key) ?? { n: 0, pts: 0, ev: 0 };
  x.n += s.n;
  x.pts += s.pts;
  x.ev += s.ev;
  into.set(key, x);
}

function AccBar({ label, n, acc, sub, onClick }: { label: string; n: number; acc: number; sub?: string; onClick?: () => void }) {
  const tone = acc >= 0.85 ? 'hi' : acc >= 0.65 ? 'mid' : 'lo';
  return (
    <button type="button" className={`acc-row tone-${tone}`} onClick={onClick} disabled={!onClick}>
      <span className="acc-label">
        {label}
        {sub && <span className="faint small"> {sub}</span>}
      </span>
      <span className="acc-track">
        <span className="acc-fill" style={{ width: `${acc * 100}%` } as CSSProperties} />
      </span>
      <span className="acc-num num">{Math.round(acc * 100)}%</span>
      <span className="acc-n faint num">{n}</span>
    </button>
  );
}

export function StatsPage() {
  const totals = useProgress((s) => s.totals);
  const setPrefs = usePrefs((s) => s.set);
  const pre = usePrefs((s) => s.preflop);
  const post = usePrefs((s) => s.postflop);

  const view = useMemo(() => {
    const byType = new Map<string, { n: number; pts: number; ev: number }>();
    const byHero = new Map<string, { n: number; pts: number; ev: number }>();
    const byKind = new Map<string, { n: number; pts: number; ev: number }>();
    const byFam = new Map<string, { n: number; pts: number; ev: number }>();
    const byPot = new Map<string, { n: number; pts: number; ev: number }>();
    const pfSpots: Array<{ id: string; s: SpotStat }> = [];
    let pfN = 0;
    let pfPts = 0;
    let poN = 0;
    let poPts = 0;
    let poEv = 0;
    for (const [k, s] of Object.entries(totals.spots)) {
      if (k.startsWith('pf:')) {
        const id = k.slice(3);
        const sp = preflopSpot(id);
        if (!sp) continue;
        add(byType, `${sp.format}|${sp.type}`, s);
        add(byHero, `${sp.format}|${sp.hero}`, s);
        pfSpots.push({ id, s });
        pfN += s.n;
        pfPts += s.pts;
      } else if (k.startsWith('po:')) {
        const [spot, kind, fam] = k.slice(3).split('/') as [string, NodeKind, Family];
        add(byKind, kind, s);
        add(byFam, fam, s);
        add(byPot, spot, s);
        poN += s.n;
        poPts += s.pts;
        poEv += s.ev;
      }
    }
    const weakest = pfSpots
      .filter((x) => x.s.n >= 5)
      .sort((a, b) => accOf(a.s) - accOf(b.s))
      .slice(0, 6);
    return { byType, byHero, byKind, byFam, byPot, weakest, pfN, pfPts, poN, poPts, poEv };
  }, [totals]);

  const days = useMemo(() => {
    const out: Array<{ key: string; n: number; label: string }> = [];
    const d = new Date();
    d.setDate(d.getDate() - 13);
    for (let i = 0; i < 14; i++) {
      const key = today(d);
      out.push({ key, n: totals.days[key] ?? 0, label: d.toLocaleDateString(undefined, { weekday: 'narrow' }) });
      d.setDate(d.getDate() + 1);
    }
    return out;
  }, [totals.days]);
  const maxDay = Math.max(1, ...days.map((d) => d.n));
  const pfMisses = totals.misses.filter((m) => m.key.startsWith('pf:')).length;
  const poMisses = totals.misses.filter((m) => m.key.startsWith('po:')).length;
  const all = view.pfN + view.poN;

  return (
    <div className="page stats-page">
      <TopBar kicker="Progress" title="Your training" />
      <div className="page-body">
        <section className="stat-tiles">
          <div className="tile panel">
            <span className="tile-k">Decisions</span>
            <b className="tile-v num">{all}</b>
          </div>
          <div className="tile panel">
            <span className="tile-k">Accuracy</span>
            <b className="tile-v num">{all ? `${Math.round(((view.pfPts + view.poPts) / all) * 100)}%` : '—'}</b>
          </div>
          <div className="tile panel">
            <span className="tile-k">Streak</span>
            <b className="tile-v num">
              <Icon name="flame" size="sm" /> {streak(totals.days)}
            </b>
          </div>
          <div className="tile panel">
            <span className="tile-k">Flop EV lost</span>
            <b className="tile-v num">{view.poN ? `${(view.poEv / view.poN).toFixed(2)}` : '—'}</b>
            <span className="tile-sub faint">bb / decision</span>
          </div>
        </section>

        <section className="panel days-panel">
          <h3>Last two weeks</h3>
          <div className="days">
            {days.map((d) => (
              <span key={d.key} className="day" title={`${d.key}: ${d.n}`}>
                <span className="day-bar" style={{ height: `${(d.n / maxDay) * 100}%` } as CSSProperties} />
                <span className="day-l faint">{d.label}</span>
              </span>
            ))}
          </div>
        </section>

        <section className="panel review-panel">
          <div>
            <h3>Review queue</h3>
            <p className="faint small">Hands you got wrong come back until you get them right.</p>
          </div>
          <div className="review-buttons">
            <button
              type="button"
              className="btn btn-sm"
              disabled={!pfMisses}
              onClick={() => {
                setPrefs({ preflop: { ...pre, focus: 'review' } });
                go(paths.preflop);
              }}
            >
              Preflop · {pfMisses}
            </button>
            <button
              type="button"
              className="btn btn-sm"
              disabled={!poMisses}
              onClick={() => {
                setPrefs({ postflop: { ...post, focus: 'review' } });
                go(paths.postflop);
              }}
            >
              Flop · {poMisses}
            </button>
          </div>
        </section>

        {view.pfN > 0 && (
          <section className="panel">
            <h3>Preflop</h3>
            <div className="acc-list">
              {[...view.byType.entries()].map(([k, s]) => {
                const [f, t] = k.split('|') as [string, SpotType];
                return (
                  <AccBar
                    key={k}
                    label={SPOT_TYPE_NAME[t]}
                    sub={f === '9max' ? '9-max' : '6-max'}
                    n={s.n}
                    acc={accOf(s)}
                    onClick={() => {
                      setPrefs({ preflop: { ...pre, format: f as '6max' | '9max', types: [t], heroes: [], focus: 'smart' } });
                      go(paths.preflop);
                    }}
                  />
                );
              })}
            </div>
            <h4>By seat</h4>
            <div className="acc-list">
              {[...view.byHero.entries()].map(([k, s]) => {
                const [f, h] = k.split('|');
                return <AccBar key={k} label={h!.replace('UTG1', 'UTG+1').replace('UTG2', 'UTG+2')} sub={f === '9max' ? '9-max' : '6-max'} n={s.n} acc={accOf(s)} />;
              })}
            </div>
            {view.weakest.length > 0 && (
              <>
                <h4>Weakest spots</h4>
                <div className="acc-list">
                  {view.weakest.map(({ id, s }) => {
                    const sp = preflopSpot(id)!;
                    return (
                      <AccBar
                        key={id}
                        label={spotTitle(sp)}
                        sub={sp.format === '9max' ? '9-max' : '6-max'}
                        n={s.n}
                        acc={accOf(s)}
                        onClick={() => go(paths.charts(id))}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </section>
        )}

        {view.poN > 0 && (
          <section className="panel">
            <h3>Flop</h3>
            <div className="acc-list">
              {[...view.byPot.entries()].map(([k, s]) => (
                <AccBar key={k} label={postflopSpot(k)?.name ?? k} n={s.n} acc={accOf(s)} sub={`${(s.ev / s.n).toFixed(2)} bb lost`} />
              ))}
            </div>
            <h4>By decision</h4>
            <div className="acc-list">
              {[...view.byKind.entries()].map(([k, s]) => (
                <AccBar
                  key={k}
                  label={NODE_KIND_NAME[k as NodeKind]}
                  n={s.n}
                  acc={accOf(s)}
                  onClick={() => {
                    setPrefs({ postflop: { ...post, nodes: [k], focus: 'smart' } });
                    go(paths.postflop);
                  }}
                />
              ))}
            </div>
            <h4>By board</h4>
            <div className="acc-list">
              {[...view.byFam.entries()].map(([k, s]) => (
                <AccBar
                  key={k}
                  label={FAMILY_NAME[k as Family]}
                  n={s.n}
                  acc={accOf(s)}
                  onClick={() => {
                    setPrefs({ postflop: { ...post, families: [k as Family], focus: 'smart' } });
                    go(paths.postflop);
                  }}
                />
              ))}
            </div>
          </section>
        )}

        {all === 0 && <div className="panel empty-panel">Nothing here yet — play a few hands and your numbers show up here.</div>}
      </div>
    </div>
  );
}
