// The betting tree of a heads-up postflop spot, built once as a *template*:
// one copy of each street's betting, with chance nodes (the turn, the river)
// pointing at a single child. The solver walks the template once per card
// dealt and keeps each copy's numbers in its own slot of big typed arrays,
// so the tree itself stays a few hundred nodes however many runouts it has.
//
// Player 0 is out of position (acts first on every street), player 1 in
// position. Sizes are fractions of the pot: a bet of 0.75 is 75% pot; a raise
// of 0.6 raises by 60% of the pot after calling (≈ 3× a bet).

export interface StreetConfig {
  /** OOP leading (empty: OOP checks first; on the flop this means no donk bets). */
  oopBet: number[];
  /** IP betting after OOP checks. */
  ipBet: number[];
  /** OOP raising a bet (check-raise or raise of a lead). */
  oopRaise: number[];
  /** IP raising a bet. */
  ipRaise: number[];
  /** Offer all-in as an extra option wherever betting or raising is open. */
  allin: boolean;
  /** Raises allowed this street after the first bet (the last of them all-in only when > 1). */
  raiseCap: number;
}

export interface TreeConfig {
  /** Pot at the start of the tree (dead money: blinds and preflop bets), bb. */
  pot: number;
  /** Effective stack behind at the start of the tree, bb. */
  stack: number;
  /** One per street from the board's street to the river (3 for a flop tree). */
  streets: StreetConfig[];
  /** A bet or raise of at least this share of the remaining stack becomes all-in. */
  allinThreshold: number;
}

export type ActionKind = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin';

export interface Action {
  kind: ActionKind;
  /** The actor's total contribution this street after the action, bb. */
  to: number;
  /** Size as a share of the pot before the action (bets / raises), for labels. */
  frac?: number;
  /** Short id used in node paths: 'x', 'c', 'f', 'b33', 'r60', 'a'. */
  id: string;
}

export type TNode = FoldNode | ShowdownNode | AllinNode | ChanceNode | ActNode;

interface Committed {
  /** Total each player has put in during the tree. */
  committed: [number, number];
  /** Index among all template nodes (the solver's per-node scratch buffers). */
  k: number;
}

export interface FoldNode extends Committed {
  t: 'fold';
  folder: 0 | 1;
}
/** Showdown on the river. */
export interface ShowdownNode extends Committed {
  t: 'show';
}
/** Both all-in before the river: run the board out. */
export interface AllinNode extends Committed {
  t: 'allin';
  street: number;
}
export interface ChanceNode {
  t: 'chance';
  k: number;
  /** The street being dealt (1 = the next card after the tree's board). */
  street: number;
  child: TNode;
}
export interface ActNode extends Committed {
  t: 'act';
  id: number;
  player: 0 | 1;
  street: number;
  actions: Action[];
  children: TNode[];
  /** Path of action ids from the root, streets separated by '/': 'x-b33-r60'. */
  path: string;
  /** Pot (including the starting pot) before this decision. */
  pot: number;
  /** Chips each player has in this street. */
  streetIn: [number, number];
}

const round2 = (x: number) => Math.round(x * 100) / 100;

export function buildTree(cfg: TreeConfig): { root: TNode; nodes: ActNode[]; count: number } {
  const nodes: ActNode[] = [];
  let k = 0;
  const last = cfg.streets.length - 1;

  const street = (s: number, committed: [number, number], path: string): TNode => {
    return decide(s, committed, [0, 0], 0, 0, path);
  };

  /** `raises`: raises made this street after the first bet. */
  const decide = (s: number, committed: [number, number], streetIn: [number, number], player: 0 | 1, raises: number, path: string): TNode => {
    const sc = cfg.streets[s]!;
    const me = player;
    const opp = (1 - player) as 0 | 1;
    const pot = cfg.pot + committed[0] + committed[1];
    const behind = cfg.stack - committed[me];
    const oppBehind = cfg.stack - committed[opp];
    const facing = streetIn[opp] - streetIn[me];
    const actions: Action[] = [];
    const seen = new Set<number>();
    const push = (a: Action) => {
      if (a.kind === 'bet' || a.kind === 'raise' || a.kind === 'allin') {
        const key = Math.round(a.to * 100);
        if (seen.has(key)) return;
        seen.add(key);
      }
      actions.push(a);
    };
    /** A bet / raise to `to` (street total); becomes all-in when it eats the stack. */
    const sized = (kind: 'bet' | 'raise', to: number, frac: number) => {
      const add = to - streetIn[me];
      const cap = streetIn[me] + Math.min(behind, oppBehind + facing);
      if (add >= behind * cfg.allinThreshold || to >= cap) push({ kind: 'allin', to: cap, id: 'a' });
      else push({ kind, to: round2(to), frac, id: `${kind === 'bet' ? 'b' : 'r'}${Math.round(frac * 100)}` });
    };

    if (facing === 0) {
      push({ kind: 'check', to: streetIn[me], id: 'x' });
      if (behind > 0 && oppBehind > 0) {
        const sizes = me === 0 ? sc.oopBet : sc.ipBet;
        for (const f of sizes) sized('bet', f * pot, f);
        if (sc.allin) push({ kind: 'allin', to: streetIn[me] + Math.min(behind, oppBehind), id: 'a' });
      }
    } else {
      push({ kind: 'fold', to: streetIn[me], id: 'f' });
      push({ kind: 'call', to: streetIn[me] + Math.min(facing, behind), id: 'c' });
      const canRaise = behind > facing && oppBehind > 0 && raises < sc.raiseCap;
      if (canRaise) {
        const lastRaise = raises === sc.raiseCap - 1 && sc.raiseCap > 1;
        if (!lastRaise) {
          const sizes = me === 0 ? sc.oopRaise : sc.ipRaise;
          for (const f of sizes) sized('raise', streetIn[opp] + f * (pot + facing), f);
        }
        if (sc.allin || lastRaise || (me === 0 ? sc.oopRaise : sc.ipRaise).length === 0) {
          push({ kind: 'allin', to: streetIn[me] + Math.min(behind, oppBehind + facing), id: 'a' });
        }
      }
    }

    const node: ActNode = {
      t: 'act',
      id: nodes.length,
      player: me,
      street: s,
      actions,
      children: [],
      path,
      pot: round2(pot),
      streetIn: [...streetIn],
      committed: [...committed],
      k: k++,
    };
    nodes.push(node);

    const sep = path === '' || path.endsWith('/') ? '' : '-';
    for (const a of actions) {
      const p = path + sep + a.id;
      const add = a.to - streetIn[me];
      const c2: [number, number] = [...committed];
      c2[me] = round2(c2[me] + add);
      const si: [number, number] = [...streetIn];
      si[me] = round2(a.to);
      let child: TNode;
      if (a.kind === 'fold') {
        child = { t: 'fold', folder: me, committed: c2, k: k++ };
      } else if (a.kind === 'check') {
        if (me === 0) child = decide(s, c2, si, 1, raises, p);
        else child = endStreet(s, c2, p);
      } else if (a.kind === 'call') {
        const allIn = c2[0] >= cfg.stack - 1e-9 || c2[1] >= cfg.stack - 1e-9;
        if (allIn) child = s === last ? { t: 'show', committed: c2, k: k++ } : { t: 'allin', street: s, committed: c2, k: k++ };
        else child = endStreet(s, c2, p);
      } else {
        const isRaise = facing > 0;
        child = decide(s, c2, si, opp, isRaise ? raises + 1 : raises, p);
      }
      node.children.push(child);
    }
    return node;
  };

  const endStreet = (s: number, committed: [number, number], path: string): TNode => {
    if (s === last) return { t: 'show', committed, k: k++ };
    const kk = k++;
    return { t: 'chance', street: s + 1, k: kk, child: street(s + 1, committed, path + '/') };
  };

  const root = street(0, [0, 0], '');
  return { root, nodes, count: k };
}
