// Play a scene's events one after another at the chosen pace, with a sound
// for each, and hand back what the table shows now. The step count belongs
// to a hand (its handKey), so a new hand starts from its first event in the
// very first frame; a scene that grows (the hero's answer) carries on.

import { useEffect, useMemo, useState } from 'react';
import { SEATS } from '@/poker/positions';
import { paceMs, usePrefs } from '@/store/prefsStore';
import { playSound } from '../sounds';
import { eventDelay, tableAt, type Scene } from './script';

export function useScript(scene: Scene | null) {
  const speed = usePrefs((s) => s.speed);
  const pace = paceMs(speed);
  const [step, setStep] = useState({ key: '', k: 0 });
  const k = scene && step.key === scene.handKey ? step.k : 0;

  useEffect(() => {
    if (!scene || k >= scene.events.length) return;
    const e = scene.events[k]!;
    const prev = k > 0 ? scene.events[k - 1] : undefined;
    const wait = prev ? eventDelay(prev, pace.step, pace.deal, SEATS[scene.format].length) : 60;
    const id = window.setTimeout(() => {
      if (e.t === 'act') playSound(e.kind === 'fold' ? 'fold' : e.kind === 'check' ? 'tap' : 'chips');
      else if (e.t === 'board' || e.t === 'deal') playSound('card');
      else if (e.t === 'collect') playSound('chips');
      setStep({ key: scene.handKey, k: k + 1 });
    }, wait);
    return () => window.clearTimeout(id);
  }, [scene, k, pace.step, pace.deal]);

  const view = useMemo(() => (scene ? tableAt(scene, k, pace.deal) : null), [scene, k, pace.deal]);
  return { view, done: !!scene && k >= scene.events.length };
}
