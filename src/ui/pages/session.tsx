// This sitting's numbers, shown above a drill: hands, accuracy, and the run
// of correct answers (which bumps when it grows).

import { useCallback, useMemo, useState } from 'react';
import { VERDICT_SCORE, type Verdict } from '@/train/grade';
import { Icon } from '../shared/Icon';

export interface Session {
  hands: number;
  points: number;
  run: number;
  bestRun: number;
  last: Verdict | null;
  add: (v: Verdict) => void;
}

export function useSession(): Session {
  const [s, setS] = useState({ hands: 0, points: 0, run: 0, bestRun: 0, last: null as Verdict | null });
  const add = useCallback((v: Verdict) => {
    setS((x) => {
      const ok = v === 'best' || v === 'good';
      const run = ok ? x.run + 1 : 0;
      return { hands: x.hands + 1, points: x.points + VERDICT_SCORE[v], run, bestRun: Math.max(x.bestRun, run), last: v };
    });
  }, []);
  return useMemo(() => ({ ...s, add }), [s, add]);
}

export function SessionBar({ session }: { session: Session }) {
  const acc = session.hands ? Math.round((session.points / session.hands) * 100) : null;
  return (
    <div className="session-bar">
      <span className="sess-item">
        <span className="sess-k">Hands</span>
        <b className="num">{session.hands}</b>
      </span>
      <span className="sess-item">
        <span className="sess-k">Accuracy</span>
        <b className={`num${acc === null ? ' faint' : ''}`}>{acc === null ? '—' : `${acc}%`}</b>
      </span>
      <span className={`sess-item sess-run${session.run >= 3 ? ' is-hot' : ''}`} key={`run${session.run}`}>
        <Icon name="flame" size="sm" />
        <b className="num">{session.run}</b>
        <span className="sess-k">in a row</span>
      </span>
      {session.last && <span className={`sess-dot verdict-${session.last}`} key={session.hands} aria-hidden />}
    </div>
  );
}
