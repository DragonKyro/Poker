// The preflop drill: a hand is dealt, the action folds round to you, you act,
// and the chart's answer for your hand comes back with the full range.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FORMAT_NAME, SEATS, type Position } from '@/poker/positions';
import { dealPreflop, matchingSpots, type PreflopDeal } from '@/preflop/drill';
import { SPOT_TYPES, SPOT_TYPE_BLURB, SPOT_TYPE_NAME, freqsOf, spotTitle } from '@/preflop/spots';
import { usePrefs, type Focus, type PreflopSetup } from '@/store/prefsStore';
import { useProgress } from '@/store/progressStore';
import { grade, VERDICT_SCORE, type Grade } from '@/train/grade';
import { actionColors } from '../grid/colors';
import { PreflopRange } from '../grid/PreflopRange';
import { Icon } from '../shared/Icon';
import { TopBar } from '../shared/Settings';
import { CardsText } from '../shared/text';
import { playSound } from '../sounds';
import { ActionBar, Feedback, shortcutFor, type ButtonSpec } from '../table/Controls';
import { PokerTable } from '../table/PokerTable';
import { raiseLabel, type Scene, type TableEvent } from '../table/script';
import { useScript } from '../table/useScript';
import { useDemoAnswer } from './demo';
import { SessionBar, useSession } from './session';

const FOCUS_NAME: Record<Focus, string> = { smart: 'Smart', all: 'All hands', edges: 'Edges only', review: 'My mistakes' };
const FOCUS_HINT: Record<Focus, string> = {
  smart: 'Mostly hands near the edge of the range, some easy ones',
  all: 'Hands as often as they really come',
  edges: 'Only mixed hands and range edges',
  review: 'Hands you got wrong before',
};

function sceneOf(deal: PreflopDeal, handNo: number, answer: { chosen: number } | null): Scene {
  const { spot } = deal;
  const events: TableEvent[] = [{ t: 'deal' }];
  let raises = 0;
  for (const h of spot.history) {
    if (h.kind === 'fold') events.push({ t: 'act', pos: h.pos, kind: 'fold', label: 'Fold' });
    else if (h.kind === 'raise') {
      raises++;
      events.push({ t: 'act', pos: h.pos, kind: 'raise', to: h.to, label: raiseLabel(raises, h.to!) });
    } else if (h.kind === 'call') events.push({ t: 'act', pos: h.pos, kind: 'call', to: h.to, label: 'Call' });
    else events.push({ t: 'act', pos: h.pos, kind: 'allin', to: 100, label: 'All-in' });
  }
  events.push({ t: 'hero' });
  if (answer) {
    const a = spot.actions[answer.chosen]!;
    events.push({ t: 'act', pos: spot.hero, kind: a.kind, to: a.to, label: a.label });
  }
  return { format: spot.format, hero: spot.hero, heroCards: deal.cards, events, handKey: `pf${handNo}`, watermark: 'GTO · 100bb' };
}

export function PreflopPage() {
  const setup = usePrefs((s) => s.preflop);
  const rng = usePrefs((s) => s.rng);
  const autoNext = usePrefs((s) => s.autoNext);
  const setPrefs = usePrefs((s) => s.set);
  const misses = useProgress((s) => s.totals.misses);
  const record = useProgress((s) => s.record);
  const session = useSession();

  const [deal, setDeal] = useState<PreflopDeal | null>(null);
  const [handNo, setHandNo] = useState(0);
  const [answer, setAnswer] = useState<{ chosen: number; grade: Grade } | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [showRange, setShowRange] = useState(false);

  const next = useCallback(() => {
    const d = dealPreflop(setup, { rng, misses: misses.filter((m) => m.key.startsWith('pf:')).map((m) => m.key), avoid: deal ? `${deal.spot.id}|${deal.cls}` : undefined });
    setDeal(d);
    setAnswer(null);
    setShowRange(false);
    setHandNo((n) => n + 1);
  }, [setup, rng, misses, deal]);

  // First hand, and a fresh one whenever the set-up changes.
  useEffect(() => {
    next();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setup, rng]);

  const scene = useMemo(() => (deal ? sceneOf(deal, handNo, answer) : null), [deal, handNo, answer]);
  const { view } = useScript(scene);
  const heroTurn = !!view?.heroTurn && !answer;

  const spot = deal?.spot;
  const freqs = useMemo(() => (deal ? freqsOf(deal.spot, deal.cls) : []), [deal]);
  const colors = useMemo(() => (spot ? actionColors(spot.actions) : []), [spot]);
  const buttons: ButtonSpec[] = useMemo(() => {
    if (!spot) return [];
    const used = new Set<string>();
    return spot.actions.map((a, i) => ({
      label: a.kind === 'call' ? 'Call' : a.label,
      sub: a.kind === 'call' ? `${fmt(spot.toCall)}` : undefined,
      color: colors[i]!,
      key: shortcutFor(a.kind, used),
    }));
  }, [spot, colors]);

  const act = useCallback(
    (i: number) => {
      if (!deal || answer) return;
      const g = grade(freqs, i, { edge: deal.edge, roll: deal.roll });
      setAnswer({ chosen: i, grade: g });
      const score = VERDICT_SCORE[g.verdict];
      record({ spot: `pf:${deal.spot.id}`, hand: deal.cls, score, best: g.verdict === 'best', miss: g.verdict === 'mistake' || g.verdict === 'blunder' });
      session.add(g.verdict);
      window.setTimeout(() => playSound(g.verdict === 'best' ? 'best' : g.verdict === 'good' ? 'good' : 'miss'), 180);
      if (autoNext && g.verdict === 'best') window.setTimeout(() => setAutoGo((x) => x + 1), 1100);
    },
    [deal, answer, freqs, record, session, autoNext],
  );
  // auto-advance tick (kept out of act() so it uses the latest `next`)
  const [autoGo, setAutoGo] = useState(0);
  useEffect(() => {
    if (autoGo > 0) next();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGo]);

  useDemoAnswer(heroTurn, act);
  const noSpots = matchingSpots(setup).length === 0;

  return (
    <div className="drill-page">
      <TopBar
        kicker={`Preflop · ${FORMAT_NAME[setup.format]}`}
        title={spot ? spotTitle(spot) : 'Preflop drill'}
        right={
          <button type="button" className="icon-btn" onClick={() => setShowSetup(true)} aria-label="Drill set-up">
            <Icon name="sliders" />
          </button>
        }
      />
      <SessionBar session={session} />
      <div className="drill-main">
        <div className="drill-table">
          {view && <PokerTable view={view} />}
          {noSpots && (
            <div className="drill-empty panel">
              Nothing matches this set-up.
              <button type="button" className="btn btn-sm" onClick={() => setShowSetup(true)}>
                Change set-up
              </button>
            </div>
          )}
        </div>
        <aside className="drill-side panel">
          {spot && answer ? (
            <>
              <h3 className="side-title">{spotTitle(spot)}</h3>
              <PreflopRange spot={spot} highlight={deal!.cls} />
            </>
          ) : (
            <div className="side-wait">
              <Icon name="eye" />
              <p>The full range appears here after you act.</p>
              {spot && <p className="faint">{SPOT_TYPE_BLURB[spot.type]}</p>}
            </div>
          )}
        </aside>
      </div>
      <div className="drill-controls">
        {deal && answer ? (
          <Feedback
            grade={answer.grade}
            labels={spot!.actions.map((a) => a.label)}
            colors={colors}
            freqs={freqs}
            chosen={answer.chosen}
            hand={
              <>
                <CardsText cards={deal.cards} /> <span className="faint">{deal.cls}</span>
              </>
            }
            roll={deal.roll}
            onNext={next}
            onRange={() => setShowRange(true)}
          />
        ) : (
          <ActionBar buttons={buttons} onAct={act} disabled={!heroTurn} roll={deal?.roll} />
        )}
      </div>
      {showSetup && <PreflopSetupSheet setup={setup} onChange={(p) => setPrefs({ preflop: { ...setup, ...p } })} onClose={() => setShowSetup(false)} />}
      {showRange && spot && deal && (
        <div className="backdrop" onClick={(e) => e.target === e.currentTarget && setShowRange(false)}>
          <div className="modal modal-wide panel" role="dialog" aria-label="Range">
            <h2>
              {spotTitle(spot)}
              <button type="button" className="icon-btn modal-close" onClick={() => setShowRange(false)} aria-label="Close">
                <Icon name="close" />
              </button>
            </h2>
            <PreflopRange spot={spot} highlight={deal.cls} />
          </div>
        </div>
      )}
    </div>
  );
}

const fmt = (x: number) => (Math.abs(x - Math.round(x)) < 0.05 ? String(Math.round(x)) : x.toFixed(1));

function PreflopSetupSheet({ setup, onChange, onClose }: { setup: PreflopSetup; onChange: (p: Partial<PreflopSetup>) => void; onClose: () => void }) {
  const seats = SEATS[setup.format];
  const toggle = <T,>(list: T[], x: T): T[] => (list.includes(x) ? list.filter((y) => y !== x) : [...list, x]);
  const count = matchingSpots(setup).length;
  return (
    <div className="backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal panel setup" role="dialog" aria-label="Drill set-up">
        <h2>
          Preflop set-up
          <button type="button" className="icon-btn modal-close" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </h2>
        <div className="setup-group">
          <div className="setup-h">Table</div>
          <div className="pill-row">
            {(['6max', '9max'] as const).map((f) => (
              <button key={f} type="button" className="pill" aria-pressed={setup.format === f} onClick={() => onChange({ format: f, heroes: [] })}>
                {FORMAT_NAME[f]}
              </button>
            ))}
          </div>
        </div>
        <div className="setup-group">
          <div className="setup-h">Situations</div>
          <div className="setup-types">
            {SPOT_TYPES.map((t) => (
              <button key={t} type="button" className="pill pill-block" aria-pressed={setup.types.includes(t)} onClick={() => onChange({ types: toggle(setup.types, t).length ? toggle(setup.types, t) : setup.types })}>
                <b>{SPOT_TYPE_NAME[t]}</b>
                <span>{SPOT_TYPE_BLURB[t]}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="setup-group">
          <div className="setup-h">
            Your seat <span className="faint">{setup.heroes.length ? '' : '(all)'}</span>
          </div>
          <div className="pill-row">
            {seats.map((p) => (
              <button key={p} type="button" className="pill" aria-pressed={setup.heroes.includes(p)} onClick={() => onChange({ heroes: toggle<Position>(setup.heroes, p) })}>
                {p === 'UTG1' ? 'UTG+1' : p === 'UTG2' ? 'UTG+2' : p}
              </button>
            ))}
          </div>
        </div>
        <div className="setup-group">
          <div className="setup-h">Hands</div>
          <div className="setup-types">
            {(['smart', 'all', 'edges', 'review'] as Focus[]).map((f) => (
              <button key={f} type="button" className="pill pill-block" aria-pressed={setup.focus === f} onClick={() => onChange({ focus: f })}>
                <b>{FOCUS_NAME[f]}</b>
                <span>{FOCUS_HINT[f]}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="setup-foot">
          <span className="faint num">{count} spots</span>
          <button type="button" className="btn" onClick={onClose}>
            Deal
          </button>
        </div>
      </div>
    </div>
  );
}
