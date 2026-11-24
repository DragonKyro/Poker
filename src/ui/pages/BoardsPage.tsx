// The board lab: for a pot, how one decision (the c-bet, facing it…) changes
// from texture to texture — every solved flop as a strategy bar, grouped by
// family with the family's average — and any flop opened up in full.

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { parseCards } from '@/poker/cards';
import { FAMILIES, FAMILY_BLURB, FAMILY_NAME, classifyFlop, flopWeight, type Family } from '@/poker/texture';
import { loadFlop, solvedFlops } from '@/postflop/load';
import { NODE_KIND_NAME, POSTFLOP_SPOTS, nodeKind, postflopSpot, type PostflopSpot } from '@/postflop/spots';
import type { SolvedFlop } from '@/postflop/types';
import { nodeAt, nodeTotals } from '@/postflop/view';
import { usePrefs } from '@/store/prefsStore';
import { CardView } from '../cards/CardView';
import { actionColors } from '../grid/colors';
import { actionName } from '../grid/labels';
import { PostflopRange } from '../grid/PostflopRange';
import { StrategyBar } from '../grid/RangeGrid';
import { go, paths } from '../router';
import { Icon } from '../shared/Icon';
import { TopBar } from '../shared/Settings';

function useWide(): boolean {
  const q = '(min-width: 900px)';
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const on = () => setWide(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return wide;
}

function useFlops(spot: PostflopSpot | undefined): SolvedFlop[] | null {
  const [data, setData] = useState<SolvedFlop[] | null>(null);
  useEffect(() => {
    if (!spot) return;
    let live = true;
    setData(null);
    void Promise.all(solvedFlops(spot.id).map((f) => loadFlop(spot.id, f))).then((d) => live && setData(d));
    return () => {
      live = false;
    };
  }, [spot]);
  return data;
}

/** The paths worth comparing across flops: the first decision and the answers to the first bets. */
function comparablePaths(spot: PostflopSpot, flops: SolvedFlop[]): string[] {
  const seen = new Map<string, number>();
  for (const f of flops) for (const n of f.nodes) if (['cbet', 'vsCbet', 'stab'].includes(nodeKind(n.path, n.player, spot.pfr))) seen.set(n.path, (seen.get(n.path) ?? 0) + 1);
  return [...seen.entries()].filter(([, c]) => c === flops.length).map(([p]) => p).sort((a, b) => a.split('-').length - b.split('-').length || a.localeCompare(b));
}

function pathLabel(spot: PostflopSpot, f: SolvedFlop, path: string): string {
  const nd = nodeAt(f, path)!;
  const kind = nodeKind(path, nd.player, spot.pfr);
  const last = path.split('-').at(-1) ?? '';
  const size = last.startsWith('b') ? ` ${last.slice(1)}%` : '';
  return `${NODE_KIND_NAME[kind]}${size}`;
}

export function BoardsPage({ spot: spotId, flop }: { spot: string | null; flop: string | null }) {
  const withData = POSTFLOP_SPOTS.filter((s) => solvedFlops(s.id).length > 0);
  const spot = (spotId ? postflopSpot(spotId) : undefined) ?? withData[0];
  if (!spot) {
    return (
      <div className="page">
        <TopBar kicker="Board lab" title="No solutions yet" />
        <div className="page-body">
          <div className="panel empty-panel">
            No flops are solved yet. Run <code>npm run solve</code> to build the solutions, then reload.
          </div>
        </div>
      </div>
    );
  }
  return flop ? <FlopDetail spot={spot} flop={flop} /> : <SpotOverview spot={spot} spots={withData} />;
}

function SpotOverview({ spot, spots }: { spot: PostflopSpot; spots: PostflopSpot[] }) {
  const flops = useFlops(spot);
  const paths_ = useMemo(() => (flops?.length ? comparablePaths(spot, flops) : []), [spot, flops]);
  const [path, setPath] = useState<string | null>(null);
  const cur = path && paths_.includes(path) ? path : paths_[0];

  const rows = useMemo(() => {
    if (!flops || cur === undefined) return [];
    return flops.map((f) => {
      const nd = nodeAt(f, cur)!;
      const cards = parseCards(f.board);
      const tex = classifyFlop(cards);
      return { f, nd, totals: nodeTotals(f, nd), tex, weight: flopWeight(cards) };
    });
  }, [flops, cur]);

  const sample = rows[0];
  const colors = sample ? actionColors(sample.nd.actions) : [];
  const labels = sample ? sample.nd.actions.map((a) => actionName(a)) : [];

  return (
    <div className="page boards-page">
      <TopBar kicker="Board lab" title={spot.name} />
      <div className="page-body">
        <div className="pill-row">
          {spots.map((s) => (
            <button key={s.id} type="button" className="pill" aria-pressed={s.id === spot.id} onClick={() => go(paths.boards(s.id), true)}>
              {s.name}
            </button>
          ))}
        </div>
        <p className="muted small">{spot.blurb}</p>
        {!flops ? (
          <div className="loading">Loading solutions…</div>
        ) : (
          <>
            {sample && (
              <div className="tabs">
                {paths_.map((p) => (
                  <button key={p} type="button" className="tab" aria-pressed={p === cur} onClick={() => setPath(p)}>
                    {pathLabel(spot, sample.f, p)}
                  </button>
                ))}
              </div>
            )}
            {sample && (
              <div className="lab-legend">
                {labels.map((l, k) => (
                  <span key={k} className="sbar-key">
                    <i style={{ background: colors[k] }} />
                    {l}
                  </span>
                ))}
              </div>
            )}
            {FAMILIES.map((fam) => {
              const fr = rows.filter((r) => r.tex.family === fam);
              if (!fr.length) return null;
              const wsum = fr.reduce((s, r) => s + r.weight, 0);
              const avg = fr[0]!.totals.map((_, k) => fr.reduce((s, r) => s + r.totals[k]! * r.weight, 0) / wsum);
              return (
                <section key={fam} className="lab-family panel">
                  <header className="lab-fam-head">
                    <div>
                      <h3>{FAMILY_NAME[fam]}</h3>
                      <p className="faint small">{FAMILY_BLURB[fam]}</p>
                    </div>
                    <div className="lab-fam-avg">
                      <StrategyBar labels={labels} freqs={avg} colors={colors} compact />
                      <span className="faint small">average</span>
                    </div>
                  </header>
                  {fr.map((r) => (
                    <button key={r.f.board} type="button" className="lab-row" onClick={() => go(paths.boards(spot.id, r.f.board))}>
                      <span className="lab-board">
                        {parseCards(r.f.board).map((c) => (
                          <CardView key={c} card={c} className="mini-card" />
                        ))}
                      </span>
                      <span className="lab-bar">
                        <StrategyBar labels={labels} freqs={r.totals} colors={colors} compact />
                        <span className="lab-nums num">
                          {r.totals.map((t, k) => (
                            <span key={k} style={{ color: colors[k] } as CSSProperties}>
                              {Math.round(t * 100)}
                            </span>
                          ))}
                        </span>
                      </span>
                      <Icon name="next" className="lab-arrow" />
                    </button>
                  ))}
                </section>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

function FlopDetail({ spot, flop }: { spot: PostflopSpot; flop: string }) {
  const [data, setData] = useState<SolvedFlop | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let live = true;
    loadFlop(spot.id, flop).then(
      (d) => live && setData(d),
      () => live && setErr(true),
    );
    return () => {
      live = false;
    };
  }, [spot.id, flop]);
  const cards = parseCards(flop);
  const tex = classifyFlop(cards);
  const nodes = useMemo(() => (data ? data.nodes.filter((n) => nodeKind(n.path, n.player, spot.pfr) !== 'other') : []), [data, spot.pfr]);
  const [path, setPath] = useState<string | null>(null);
  const node = nodes.find((n) => n.path === path) ?? nodes[0];
  const setPrefs = usePrefs((s) => s.set);
  const setup = usePrefs((s) => s.postflop);
  const wideScreen = useWide();

  return (
    <div className="page boards-page">
      <TopBar kicker={`Board lab · ${spot.name}`} title={FAMILY_NAME[tex.family]} backTo={paths.boards(spot.id)} />
      <div className="page-body">
        <div className="flop-hero">
          <div className="flop-cards">
            {cards.map((c, i) => (
              <CardView key={c} card={c} className="flop-card" style={{ '--i': i } as CSSProperties} />
            ))}
          </div>
          <div className="flop-tags">
            {tex.tags.map((t) => (
              <span key={t} className="chip">
                {t}
              </span>
            ))}
          </div>
          {data && (
            <p className="faint small num">
              Range EV: {spot.oop} {data.ev[0].toFixed(2)} bb · {spot.ip} {data.ev[1].toFixed(2)} bb · pot {spot.tree.pot} bb · solved to {(data.exploit * 100).toFixed(2)}% pot
            </p>
          )}
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => {
              setPrefs({ postflop: { ...setup, spots: [spot.id], families: [tex.family as Family] } });
              go(paths.postflop);
            }}
          >
            <Icon name="play" size="sm" /> Drill {FAMILY_NAME[tex.family].toLowerCase()} boards
          </button>
        </div>
        {err && <div className="panel empty-panel">This flop isn’t solved.</div>}
        {data && node && (
          <>
            <div className="tabs">
              {nodes.map((n) => (
                <button key={n.path} type="button" className="tab" aria-pressed={n === node} onClick={() => setPath(n.path)}>
                  {pathLabel(spot, data, n.path)}
                  <span className="tab-sub">{n.player === 0 ? spot.oop : spot.ip}</span>
                </button>
              ))}
            </div>
            <div className="panel flop-panel">
              <PostflopRange key={node.path} data={data} node={node} wide={wideScreen} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
