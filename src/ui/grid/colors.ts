// One colour per action, the same on buttons, grid cells and strategy bars:
// fold blue, check / call green, bets warm from amber (small) to red (big),
// all-in magenta.

export type ActionLike = { kind: string; frac?: number; to?: number };

export function actionColor(a: ActionLike, all?: readonly ActionLike[]): string {
  switch (a.kind) {
    case 'fold':
      return 'var(--a-fold)';
    case 'check':
    case 'call':
      return 'var(--a-call)';
    case 'allin':
      return 'var(--a-allin)';
    case 'raise':
    case 'bet': {
      // Rank the sized actions of this node: smallest amber, then orange, then red.
      const sized = (all ?? [a]).filter((x) => x.kind === 'bet' || x.kind === 'raise');
      if (sized.length <= 1 && a.kind === 'raise' && a.frac === undefined) return 'var(--a-raise)';
      const order = [...sized].sort((x, y) => (x.frac ?? x.to ?? 0) - (y.frac ?? y.to ?? 0));
      const k = order.indexOf(a);
      const palette = sized.length === 1 ? ['var(--a-bet2)'] : sized.length === 2 ? ['var(--a-bet1)', 'var(--a-bet3)'] : ['var(--a-bet1)', 'var(--a-bet2)', 'var(--a-bet3)'];
      return palette[Math.max(0, k)] ?? palette[palette.length - 1]!;
    }
    default:
      return 'var(--fg-muted)';
  }
}

export const actionColors = (actions: readonly ActionLike[]): string[] => actions.map((a) => actionColor(a, actions));
