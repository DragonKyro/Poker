// Names for solver actions: "Check", "Bet 33%", "Raise 12.3", "Call 4.1", "All-in".

import type { StoredAction } from '@/postflop/types';

const fmt = (x: number) => (Math.abs(x - Math.round(x)) < 0.05 ? String(Math.round(x)) : x.toFixed(1));

export function actionName(a: StoredAction): string {
  switch (a.kind) {
    case 'fold':
      return 'Fold';
    case 'check':
      return 'Check';
    case 'call':
      return 'Call';
    case 'bet':
      return `Bet ${Math.round((a.frac ?? 0) * 100)}%`;
    case 'raise':
      return `Raise ${fmt(a.to)}`;
    case 'allin':
      return 'All-in';
  }
}

/** The chips an action puts in now (for button sub-labels). */
export function actionAmount(a: StoredAction, node: { streetIn: [number, number]; player: 0 | 1 }): number {
  return Math.max(0, a.to - node.streetIn[node.player]);
}

export { fmt as fmtBB };
