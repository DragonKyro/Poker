// Home: the title over a floating hand and chips, today's numbers, and the
// five ways in — the two drills, the charts, the board lab, the stats.

import { useState, type CSSProperties } from 'react';
import { parseCards } from '@/poker/cards';
import { SOLVED } from '@/postflop/load';
import { useCloud } from '@/net/cloud';
import { accuracy, streak, today, useProgress } from '@/store/progressStore';
import { CardImg } from '../cards/CardView';
import { go, paths } from '../router';
import { Icon, type IconName } from '../shared/Icon';
import { SettingsModal, SyncDot } from '../shared/Settings';
import { ChipStack } from '../table/PokerTable';

function sumStats(spots: Record<string, { n: number; pts: number }>, prefix: string) {
  let n = 0;
  let pts = 0;
  for (const [k, s] of Object.entries(spots)) {
    if (!k.startsWith(prefix)) continue;
    n += s.n;
    pts += s.pts;
  }
  return { n, pts, acc: accuracy({ n, pts, best: 0, ev: 0, at: 0 }) };
}

interface Mode {
  key: string;
  icon: IconName;
  title: string;
  blurb: string;
  to: string;
  stat?: string;
  accent: string;
}

export function Home() {
  const totals = useProgress((s) => s.totals);
  const cloud = useCloud();
  const [settings, setSettings] = useState(false);
  const pf = sumStats(totals.spots, 'pf:');
  const po = sumStats(totals.spots, 'po:');
  const todayN = totals.days[today()] ?? 0;
  const run = streak(totals.days);
  const all = pf.n + po.n;
  const allAcc = all ? (pf.pts + po.pts) / all : null;
  const solved = SOLVED.length;

  const modes: Mode[] = [
    {
      key: 'preflop',
      icon: 'target',
      title: 'Preflop drill',
      blurb: 'Open, defend, 3-bet and 4-bet — 6-max and 9-max, 100bb',
      to: paths.preflop,
      stat: pf.n ? `${Math.round((pf.acc ?? 0) * 100)}% · ${pf.n} hands` : 'Start here',
      accent: 'var(--a-raise)',
    },
    {
      key: 'postflop',
      icon: 'layers',
      title: 'Flop drill',
      blurb: 'C-bet, defend, raise — against solver strategies on every board texture',
      to: paths.postflop,
      stat: solved ? (po.n ? `${Math.round((po.acc ?? 0) * 100)}% · ${po.n} hands` : `${solved} solved flops`) : 'Solutions coming',
      accent: 'var(--a-call)',
    },
    {
      key: 'charts',
      icon: 'grid',
      title: 'Range charts',
      blurb: 'Every preflop chart, cell by cell',
      to: paths.charts(),
      accent: 'var(--a-fold)',
    },
    {
      key: 'boards',
      icon: 'chart',
      title: 'Board lab',
      blurb: 'How the strategy shifts from ace-high to monotone',
      to: paths.boards(),
      accent: 'var(--a-bet1)',
    },
    {
      key: 'stats',
      icon: 'flame',
      title: 'Progress',
      blurb: 'Accuracy by spot, your leaks, and the review queue',
      to: paths.stats,
      stat: totals.misses.length ? `${totals.misses.length} to review` : undefined,
      accent: 'var(--a-allin)',
    },
  ];

  const fan = parseCards('AsKh');
  return (
    <div className="home">
      <div className="home-top">
        <SyncDot />
        <button type="button" className="icon-btn" onClick={() => setSettings(true)} aria-label="Settings and account">
          {cloud.user?.photo ? <img className="avatar" src={cloud.user.photo} alt="" referrerPolicy="no-referrer" /> : <Icon name="gear" />}
        </button>
      </div>

      <section className="hero">
        <div className="hero-glow" aria-hidden />
        <div className="hero-art" aria-hidden>
          <span className="hero-chips hero-chips-l">
            <ChipStack amount={36} />
          </span>
          {fan.map((c, i) => (
            <span key={c} className="hero-card" style={{ '--k': i * 2 - 1 } as CSSProperties}>
              <span className="hero-card-float card">
                <CardImg card={c} layout="full" />
              </span>
            </span>
          ))}
          <span className="hero-chips hero-chips-r">
            <ChipStack amount={12.5} />
          </span>
        </div>
        <h1 className="hero-title">
          Poker <span>Trainer</span>
        </h1>
        <p className="hero-tag">GTO no-limit hold’em, drilled one decision at a time — with the solver’s answer after every hand.</p>
        <div className="hero-stats">
          <span className="chip">
            <Icon name="flame" size="sm" /> {run} day{run === 1 ? '' : 's'}
          </span>
          <span className="chip num">{todayN} today</span>
          {allAcc !== null && <span className="chip num">{Math.round(allAcc * 100)}% accuracy</span>}
        </div>
        <button type="button" className="btn btn-lg btn-shine hero-go" onClick={() => go(pf.n === 0 || !solved ? paths.preflop : paths.postflop)}>
          <Icon name="play" size="sm" /> {all === 0 ? 'Start training' : 'Keep training'}
        </button>
      </section>

      <section className="modes">
        {modes.map((m, k) => (
          <button key={m.key} type="button" className={`mode-card mode-${m.key}`} style={{ '--k': k, '--accent': m.accent } as CSSProperties} onClick={() => go(m.to)}>
            <span className="mode-icon">
              <Icon name={m.icon} />
            </span>
            <span className="mode-body">
              <span className="mode-title">{m.title}</span>
              <span className="mode-blurb">{m.blurb}</span>
            </span>
            {m.stat && <span className="mode-stat num">{m.stat}</span>}
            <Icon name="next" className="mode-arrow" />
          </button>
        ))}
      </section>

      <footer className="home-foot faint">
        Preflop charts approximate solver output for 100bb cash (no ante). Flop strategies come from this app’s own CFR solver, run over full turn and river trees with simplified bet sizes.
      </footer>
      {settings && <SettingsModal onClose={() => setSettings(false)} />}
    </div>
  );
}
