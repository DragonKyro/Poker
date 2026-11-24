// The flop drill: the preflop action plays out, the flop is dealt, the line
// to your decision is played, you act, and the solver's strategy for your
// exact combo comes back with the EV of each option and the whole range.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { comboIndex } from '@/poker/hands';
import { describeHand } from '@/poker/madeHand';
import { parseCards } from '@/poker/cards';
import { FAMILIES, FAMILY_NAME, FAMILY_BLURB, classifyFlop, type Family } from '@/poker/texture';
import { dealPostflop, spotsWithData, statKey, TRAINED_KINDS, type PostflopDeal } from '@/postflop/drill';
import { NODE_KIND_NAME, POSTFLOP_SPOTS, type NodeKind } from '@/postflop/spots';
import { evFromHere, pathSteps } from '@/postflop/view';
import { preflopSpot } from '@/preflop/spots';
import { usePrefs, type Focus, type PostflopSetup } from '@/store/prefsStore';
import { useProgress } from '@/store/progressStore';
import { grade, VERDICT_SCORE, type Grade } from '@/train/grade';
import { actionColors } from '../grid/colors';
import { actionAmount, actionName, fmtBB } from '../grid/labels';
import { PostflopRange } from '../grid/PostflopRange';
import { go, paths } from '../router';
import { Icon } from '../shared/Icon';
import { TopBar } from '../shared/Settings';
import { CardsText } from '../shared/text';
import { playSound } from '../sounds';
import { ActionBar, Feedback, shortcutFor, type ButtonSpec } from '../table/Controls';
import { PokerTable } from '../table/PokerTable';
import { raiseLabel, type ActKind, type Scene, type TableEvent } from '../table/script';
import { useScript } from '../table/useScript';
import { useDemoAnswer } from './demo';
import { SessionBar, useSession } from './session';

const FOCUS_NAME: Record<Focus, string> = { smart: 'Smart', all: 'All hands', edges: 'Mixed only', review: 'My mistakes' };

/** The preflop action that leads to a postflop spot. */
function preflopEvents(deal: PostflopDeal): TableEvent[] {
  const s = deal.spot;
  const opener = s.pot === 'srp' ? (s.pfr === 1 ? s.ip : s.oop) : s.pfr === 0 ? s.ip : s.oop;
  const other = opener === s.ip ? s.oop : s.ip;
  const pre = s.pot === 'srp' ? preflopSpot(`6max/vsRFI/${other}/${opener}`)! : preflopSpot(`6max/vs3B/${opener}/${other}`)!;
  const events: TableEvent[] = [];
  let raises = 0;
  for (const h of pre.history) {
    if (h.kind === 'fold') events.push({ t: 'act', pos: h.pos, kind: 'fold', label: 'Fold' });
    else if (h.kind === 'raise') {
      raises++;
      events.push({ t: 'act', pos: h.pos, kind: 'raise', to: h.to, label: raiseLabel(raises, h.to!) });
    }
  }
  const last = pre.history.filter((h) => h.kind === 'raise').at(-1)!;
  events.push({ t: 'act', pos: pre.hero, kind: 'call', to: last.to, label: 'Call' });
  return events;
}

function labelOf(kind: ActKind, to: number): string {
  if (kind === 'bet') return `Bet ${fmtBB(to)}`;
  if (kind === 'raise') return `Raise ${fmtBB(to)}`;
  return kind === 'allin' ? 'All-in' : kind === 'call' ? 'Call' : kind === 'check' ? 'Check' : 'Fold';
}

function sceneOf(deal: PostflopDeal, handNo: number, answer: { chosen: number } | null): Scene {
  const { spot, node, data } = deal;
  const pos = (p: 0 | 1) => (p === 0 ? spot.oop : spot.ip);
  const events: TableEvent[] = [{ t: 'deal' }, ...preflopEvents(deal), { t: 'collect' }, { t: 'board', cards: parseCards(data.board) }];
  for (const st of pathSteps(data, node.path)) {
    const k = st.action.kind as ActKind;
    events.push({ t: 'act', pos: pos(st.player), kind: k, to: st.action.to, label: labelOf(k, st.action.to) });
  }
  events.push({ t: 'hero' });
  if (answer) {
    const a = node.actions[answer.chosen]!;
    events.push({ t: 'act', pos: pos(node.player), kind: a.kind as ActKind, to: a.to, label: labelOf(a.kind as ActKind, a.to) });
  }
  return { format: '6max', hero: pos(node.player), heroCards: deal.cards, events, handKey: `po${handNo}`, watermark: spot.pot === 'srp' ? 'Single-raised pot' : '3-bet pot' };
}

export function PostflopPage() {
  const setup = usePrefs((s) => s.postflop);
  const rng = usePrefs((s) => s.rng);
  const autoNext = usePrefs((s) => s.autoNext);
  const setPrefs = usePrefs((s) => s.set);
  const misses = useProgress((s) => s.totals.misses);
  const record = useProgress((s) => s.record);
  const session = useSession();

  const [deal, setDeal] = useState<PostflopDeal | null>(null);
  const [handNo, setHandNo] = useState(0);
  const [answer, setAnswer] = useState<{ chosen: number; grade: Grade } | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [showRange, setShowRange] = useState(false);
  const [empty, setEmpty] = useState(false);
  const ticket = useRef(0);

  const next = useCallback(() => {
    const t = ++ticket.current;
    void dealPostflop(setup, { rng, misses: misses.filter((m) => m.key.startsWith('po:')).map((m) => m.key) }).then((d) => {
      if (t !== ticket.current) return;
      setEmpty(!d);
      setDeal(d);
      setAnswer(null);
      setShowRange(false);
      setHandNo((n) => n + 1);
    });
  }, [setup, rng, misses]);

  useEffect(() => {
    next();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setup, rng]);

  const scene = useMemo(() => (deal ? sceneOf(deal, handNo, answer) : null), [deal, handNo, answer]);
  const { view } = useScript(scene);
  const heroTurn = !!view?.heroTurn && !answer;

  const node = deal?.node;
  const n = deal ? deal.data.hands[deal.node.player].length : 0;
  const freqs = useMemo(() => (deal ? deal.node.actions.map((_, a) => deal.node.freq[a * n + deal.hand]!) : []), [deal, n]);
  const evs = useMemo(() => (deal ? deal.node.actions.map((_, a) => evFromHere(deal.node, deal.node.ev[a * n + deal.hand]!)) : []), [deal, n]);
  const colors = useMemo(() => (node ? actionColors(node.actions) : []), [node]);
  const buttons: ButtonSpec[] = useMemo(() => {
    if (!node) return [];
    const used = new Set<string>();
    return node.actions.map((a, i) => {
      const amt = actionAmount(a, node);
      return {
        label: actionName(a),
        sub: a.kind === 'fold' || a.kind === 'check' ? undefined : a.kind === 'bet' ? fmtBB(a.to) : fmtBB(amt),
        color: colors[i]!,
        key: shortcutFor(a.kind, used) ?? String(i + 1),
      };
    });
  }, [node, colors]);

  const act = useCallback(
    (i: number) => {
      if (!deal || answer) return;
      const g = grade(freqs, i, { edge: deal.edge, roll: deal.roll, evs, pot: deal.node.pot });
      setAnswer({ chosen: i, grade: g });
      const combo = deal.data.hands[deal.node.player][deal.hand]!;
      record({
        spot: statKey(deal.spot.id, deal.kind, deal.family),
        hand: `${deal.flop}/${deal.node.path}/${combo}`,
        score: VERDICT_SCORE[g.verdict],
        best: g.verdict === 'best',
        miss: g.verdict === 'mistake' || g.verdict === 'blunder',
        evLoss: g.evLoss,
      });
      session.add(g.verdict);
      window.setTimeout(() => playSound(g.verdict === 'best' ? 'best' : g.verdict === 'good' ? 'good' : 'miss'), 180);
      if (autoNext && g.verdict === 'best') window.setTimeout(() => next(), 1300);
    },
    [deal, answer, freqs, evs, record, session, autoNext, next],
  );

  useDemoAnswer(heroTurn, act);
  const info = deal ? describeHand(deal.cards, parseCards(deal.flop)) : null;
  const tex = deal ? classifyFlop(parseCards(deal.flop)) : null;
  const heroCombo = deal ? comboIndex(deal.cards[0], deal.cards[1]) : undefined;
  const title = deal ? `${deal.spot.name} · ${NODE_KIND_NAME[deal.kind]}` : 'Flop drill';

  return (
    <div className="drill-page">
      <TopBar
        kicker={deal ? `Flop · ${FAMILY_NAME[deal.family]}` : 'Flop drill'}
        title={title}
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
          {deal && tex && view?.board.length ? (
            <div className="board-tags" key={deal.flop + handNo}>
              {tex.tags.map((t) => (
                <span key={t} className="chip">
                  {t}
                </span>
              ))}
            </div>
          ) : null}
          {empty && (
            <div className="drill-empty panel">
              {spotsWithData().length === 0 ? (
                <>No flops are solved yet. Run <code>npm run solve</code> to build the solutions.</>
              ) : (
                <>Nothing matches this set-up.</>
              )}
              <button type="button" className="btn btn-sm" onClick={() => setShowSetup(true)}>
                Change set-up
              </button>
            </div>
          )}
        </div>
        <aside className="drill-side panel">
          {deal && answer ? (
            <>
              <h3 className="side-title">
                {deal.spot.name} · <CardsText cards={parseCards(deal.flop)} />
              </h3>
              <PostflopRange data={deal.data} node={deal.node} heroCombo={heroCombo} />
              <button type="button" className="btn btn-ghost btn-sm side-link" onClick={() => go(paths.boards(deal.spot.id, deal.flop))}>
                <Icon name="chart" size="sm" /> Study this flop
              </button>
            </>
          ) : (
            <div className="side-wait">
              <Icon name="eye" />
              <p>The solver’s strategy for the whole range appears here after you act.</p>
              {deal && <p className="faint">{deal.spot.blurb}</p>}
            </div>
          )}
        </aside>
      </div>
      <div className="drill-controls">
        {deal && answer && node ? (
          <Feedback
            grade={answer.grade}
            labels={node.actions.map((a) => actionName(a))}
            colors={colors}
            freqs={freqs}
            chosen={answer.chosen}
            evs={evs}
            roll={deal.roll}
            hand={
              <>
                <CardsText cards={deal.cards} /> <span className="faint">{info?.label}</span>
              </>
            }
            onNext={next}
            onRange={() => setShowRange(true)}
          />
        ) : (
          <ActionBar buttons={buttons} onAct={act} disabled={!heroTurn} roll={deal?.roll} />
        )}
      </div>
      {showSetup && <PostflopSetupSheet setup={setup} onChange={(p) => setPrefs({ postflop: { ...setup, ...p } })} onClose={() => setShowSetup(false)} />}
      {showRange && deal && (
        <div className="backdrop" onClick={(e) => e.target === e.currentTarget && setShowRange(false)}>
          <div className="modal modal-wide panel" role="dialog" aria-label="Range">
            <h2>
              <span>
                {deal.spot.name} · <CardsText cards={parseCards(deal.flop)} />
              </span>
              <button type="button" className="icon-btn modal-close" onClick={() => setShowRange(false)} aria-label="Close">
                <Icon name="close" />
              </button>
            </h2>
            <PostflopRange data={deal.data} node={deal.node} heroCombo={heroCombo} />
          </div>
        </div>
      )}
    </div>
  );
}

function PostflopSetupSheet({ setup, onChange, onClose }: { setup: PostflopSetup; onChange: (p: Partial<PostflopSetup>) => void; onClose: () => void }) {
  const toggle = <T,>(list: T[], x: T): T[] => (list.includes(x) ? list.filter((y) => y !== x) : [...list, x]);
  const have = new Set(spotsWithData().map((s) => s.id));
  return (
    <div className="backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal panel setup" role="dialog" aria-label="Drill set-up">
        <h2>
          Flop set-up
          <button type="button" className="icon-btn modal-close" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </h2>
        <div className="setup-group">
          <div className="setup-h">
            Pots <span className="faint">{setup.spots.length ? '' : '(all)'}</span>
          </div>
          <div className="pill-row">
            {POSTFLOP_SPOTS.map((s) => (
              <button key={s.id} type="button" className="pill" disabled={!have.has(s.id)} aria-pressed={setup.spots.includes(s.id)} onClick={() => onChange({ spots: toggle(setup.spots, s.id) })} title={s.blurb}>
                {s.name}
              </button>
            ))}
          </div>
        </div>
        <div className="setup-group">
          <div className="setup-h">
            Boards <span className="faint">{setup.families.length ? '' : '(all)'}</span>
          </div>
          <div className="pill-row">
            {FAMILIES.map((f) => (
              <button key={f} type="button" className="pill" aria-pressed={setup.families.includes(f)} onClick={() => onChange({ families: toggle<Family>(setup.families, f) })} title={FAMILY_BLURB[f]}>
                {FAMILY_NAME[f]}
              </button>
            ))}
          </div>
        </div>
        <div className="setup-group">
          <div className="setup-h">
            Decisions <span className="faint">{setup.nodes.length ? '' : '(all)'}</span>
          </div>
          <div className="pill-row">
            {TRAINED_KINDS.map((k) => (
              <button key={k} type="button" className="pill" aria-pressed={setup.nodes.includes(k)} onClick={() => onChange({ nodes: toggle<string>(setup.nodes, k) })}>
                {NODE_KIND_NAME[k as NodeKind]}
              </button>
            ))}
          </div>
        </div>
        <div className="setup-group">
          <div className="setup-h">Hands</div>
          <div className="pill-row">
            {(['smart', 'all', 'edges', 'review'] as Focus[]).map((f) => (
              <button key={f} type="button" className="pill" aria-pressed={setup.focus === f} onClick={() => onChange({ focus: f })}>
                {FOCUS_NAME[f]}
              </button>
            ))}
          </div>
        </div>
        <div className="setup-foot">
          <span className="faint">{have.size ? `${have.size} of ${POSTFLOP_SPOTS.length} pots solved` : 'No solutions yet'}</span>
          <button type="button" className="btn" onClick={onClose}>
            Deal
          </button>
        </div>
      </div>
    </div>
  );
}
