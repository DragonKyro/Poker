// Grading one decision against a mixed strategy.
//
// Solvers mix: a hand may raise 60% and call 40%, and both are right. So an
// action is judged by how often GTO takes it (and, postflop, by the EV it
// gives up):
//   best        — the most frequent action, or taken ≥ 35% of the time
//   good        — a real part of the mix (≥ 10%)
//   inaccuracy  — a rare mix (> 0), or (postflop) an EV loss ≤ 1% pot
//   mistake     — never played here (0%) near the range's edge; postflop,
//                 an EV loss up to 10% pot
//   blunder     — never played and far from the edge (folding a hand that
//                 always continues…); postflop, an EV loss over 10% pot
// With the RNG on, a 1–100 roll picks which action of the mix is "the" one,
// like GTO Wizard's randomiser: the matching action is best, the rest of the
// mix good.

export type Verdict = 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';

export const VERDICT_SCORE: Record<Verdict, number> = { best: 1, good: 0.85, inaccuracy: 0.5, mistake: 0.15, blunder: 0 };

export const VERDICT_NAME: Record<Verdict, string> = {
  best: 'Correct',
  good: 'Good',
  inaccuracy: 'Inaccuracy',
  mistake: 'Mistake',
  blunder: 'Blunder',
};

export interface Grade {
  verdict: Verdict;
  /** Frequency of the chosen action, 0..1. */
  freq: number;
  /** The action GTO prefers (highest frequency, or the roll's pick). */
  target: number;
  /** EV given up vs the best action, bb (postflop). */
  evLoss?: number;
  /** EV loss as a share of the pot. */
  evLossPot?: number;
}

/** Which action a 0..99 roll lands on, walking the actions from the most aggressive down. */
export function rollAction(freqs: readonly number[], roll: number): number {
  let acc = 0;
  for (let a = freqs.length - 1; a >= 0; a--) {
    acc += freqs[a]! * 100;
    if (roll < acc - 1e-9) return a;
  }
  // rounding: the most frequent action
  return freqs.indexOf(Math.max(...freqs));
}

const argmax = (xs: readonly number[]) => xs.reduce((best, x, i) => (x > xs[best]! ? i : best), 0);

/**
 * @param freqs  GTO frequency of each action for this hand
 * @param chosen index of the action taken
 * @param edge   the hand sits at a range edge (mixed, or a neighbour plays differently)
 * @param roll   0..99 when the RNG is on
 * @param evs    EV of each action, bb (postflop)
 * @param pot    pot before the decision, bb (to express EV loss in % pot)
 */
export function grade(freqs: readonly number[], chosen: number, opts: { edge?: boolean; roll?: number; evs?: readonly number[]; pot?: number } = {}): Grade {
  const f = freqs[chosen] ?? 0;
  const top = argmax(freqs);
  const target = opts.roll !== undefined ? rollAction(freqs, opts.roll) : top;
  let evLoss: number | undefined;
  let evLossPot: number | undefined;
  if (opts.evs) {
    const best = Math.max(...opts.evs.filter((_, i) => freqs[i]! > 0.001));
    evLoss = Math.max(0, best - opts.evs[chosen]!);
    evLossPot = opts.pot ? evLoss / opts.pot : undefined;
  }

  let verdict: Verdict;
  if (opts.roll !== undefined && f > 0.001) {
    verdict = chosen === target ? 'best' : f >= 0.1 ? 'good' : 'inaccuracy';
  } else if (chosen === top || f >= 0.35) {
    verdict = 'best';
  } else if (f >= 0.1) {
    verdict = 'good';
  } else if (f > 0.001) {
    verdict = 'inaccuracy';
  } else {
    verdict = opts.edge ? 'mistake' : 'blunder';
  }

  // Postflop: for an action the solver (almost) never takes, the EV says how
  // much it costs. A real part of the mix (≥ 10%) keeps its frequency
  // verdict: at equilibrium mixed actions are worth the same, so an EV gap
  // there is solver noise, not a mistake.
  if (evLossPot !== undefined && f < 0.1 && verdict !== 'best') {
    if (evLossPot <= 0.01) verdict = 'inaccuracy';
    else if (evLossPot <= 0.04) verdict = f > 0.001 ? 'inaccuracy' : 'mistake';
    else if (evLossPot <= 0.1) verdict = 'mistake';
    else verdict = 'blunder';
  }

  return { verdict, freq: f, target, evLoss, evLossPot };
}
