// Preflop charts: who has acted, what the hero may do, and how often each
// hand class takes each action.

import type { Format, Position } from '@/poker/positions';

/**
 * The four decision families, named for what the hero faces:
 * - RFI: folded to the hero, who opens or folds.
 * - vsRFI: one player opened (villain); the hero folds, calls or 3-bets.
 * - vs3B: the hero opened, villain 3-bet; fold, call or 4-bet.
 * - vs4B: the hero 3-bet villain's open, villain 4-bet; fold, call or 5-bet all-in.
 */
export type SpotType = 'RFI' | 'vsRFI' | 'vs3B' | 'vs4B';

/**
 * Authored chart for one spot, in range notation (src/poker/range.ts).
 * Each key is the share of a class taking that action; fold is whatever is
 * left (1 − raise − call − allin). A class may mix: "AQo:0.6" under raise
 * and "AQo:0.4" under call. Weights per class must not sum above 1.
 *
 * - RFI: `raise` (the open).
 * - vsRFI: `raise` (3-bet), `call`.
 * - vs3B: `raise` (4-bet), `call`, optional `allin` (jam over the 3-bet).
 * - vs4B: `allin` (5-bet jam), `call`.
 */
export interface ChartSource {
  raise?: string;
  call?: string;
  allin?: string;
  /** One or two sentences on what the spot teaches, shown with the chart. */
  note?: string;
}

/** Charts keyed `${type}/${hero}` for RFI, else `${type}/${hero}/${villain}`. */
export type ChartBook = Record<string, ChartSource>;

export type ActionKind = 'fold' | 'call' | 'raise' | 'allin';

export interface PfAction {
  kind: ActionKind;
  /** Total bet the action makes it, in bb (raise / allin). */
  to?: number;
  /** Button text: "Fold", "Call 2.5", "3-Bet 7.5", "All-in 100". */
  label: string;
}

/** One action already taken at the table before the hero acts. */
export interface PriorAction {
  pos: Position;
  kind: 'fold' | 'raise' | 'call' | 'allin';
  to?: number;
}

export interface PreflopSpot {
  /** '6max/RFI/UTG', '6max/vsRFI/BB/BTN', '6max/vs3B/BTN/BB', '6max/vs4B/BB/BTN'. */
  id: string;
  format: Format;
  type: SpotType;
  hero: Position;
  villain: Position | null;
  /** Fold first, then passive to aggressive. */
  actions: PfAction[];
  /** strategy[action][class]: frequency 0..1, classes in HAND_CLASSES order. */
  strategy: Float32Array[];
  /**
   * How often each class arrives at this decision: 1 for RFI / vsRFI; the
   * hero's open frequency for vs3B, their 3-bet frequency for vs4B (the
   * chart's frequencies are conditional on that). Drills deal by it; the
   * grid greys out what can't be here.
   */
  reach: Float32Array;
  /** Everything that happened before the hero's decision, in order (blinds are posted, not listed). */
  history: PriorAction[];
  /** The hero's own chips already in (blind or earlier raise), and the bet to match. */
  heroIn: number;
  toCall: number;
  pot: number;
  note?: string;
  /** Where the chart came from: authored for this format, or borrowed from 6-max. */
  source: 'chart' | 'mapped';
}
