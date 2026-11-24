// Per-device preferences and drill set-ups, kept in localStorage.

import { create } from 'zustand';
import { LS } from '@/net/firebaseConfig';
import type { Format, Position } from '@/poker/positions';
import type { Family } from '@/poker/texture';
import type { SpotType } from '@/preflop/types';

export type Speed = 'relaxed' | 'normal' | 'fast';
/** Which hands a drill deals: the real mix, the decisions near range edges, or past mistakes. */
export type Focus = 'smart' | 'all' | 'edges' | 'review';

export interface PreflopSetup {
  format: Format;
  types: SpotType[];
  /** Hero seats to drill (empty: all). */
  heroes: Position[];
  focus: Focus;
}

export interface PostflopSetup {
  /** Postflop spot ids (empty: all). */
  spots: string[];
  /** Board families (empty: all). */
  families: Family[];
  /** Decision kinds (empty: all). */
  nodes: string[];
  focus: Focus;
}

export interface Prefs {
  /** Four-colour deck (♦ blue, ♣ green), the online-poker standard. */
  fourColor: boolean;
  sound: boolean;
  speed: Speed;
  /** Show a 1–100 roll before each decision and grade mixed hands by it. */
  rng: boolean;
  /** Go on to the next hand by itself after a best answer. */
  autoNext: boolean;
  preflop: PreflopSetup;
  postflop: PostflopSetup;
}

const KEY = `${LS}.prefs`;
const DEFAULTS: Prefs = {
  fourColor: true,
  sound: true,
  speed: 'normal',
  rng: false,
  autoNext: false,
  preflop: { format: '6max', types: ['RFI', 'vsRFI', 'vs3B', 'vs4B'], heroes: [], focus: 'smart' },
  postflop: { spots: [], families: [], nodes: [], focus: 'smart' },
};

function load(): Prefs {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Prefs>;
    return { ...DEFAULTS, ...saved, preflop: { ...DEFAULTS.preflop, ...saved.preflop }, postflop: { ...DEFAULTS.postflop, ...saved.postflop } };
  } catch {
    return DEFAULTS;
  }
}

type Store = Prefs & { set: (p: Partial<Prefs>) => void };

export const usePrefs = create<Store>((set, get) => ({
  ...load(),
  set: (p) => {
    set(p);
    const { set: _s, ...prefs } = { ...get(), ...p };
    void _s;
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs));
    } catch {
      /* private mode */
    }
  },
}));

/** Milliseconds for the table's pacing. */
export function paceMs(speed: Speed): { step: number; deal: number } {
  switch (speed) {
    case 'relaxed':
      return { step: 620, deal: 110 };
    case 'fast':
      return { step: 220, deal: 45 };
    default:
      return { step: 400, deal: 75 };
  }
}
