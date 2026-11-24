// Training progress. Each device keeps its own record — per-spot counters,
// hands per day, and the hands it got wrong (for review) — and the totals
// are the sum over devices. In the cloud every device writes only its own
// entry, so two devices training offline never overwrite each other: the
// counters only grow, and a miss / its clearing carries a timestamp (newest
// wins). Saved in localStorage; synced by net/cloud.ts.

import { create } from 'zustand';
import { LS } from '@/net/firebaseConfig';

export interface SpotStat {
  /** Decisions answered. */
  n: number;
  /** Sum of scores (1 best … 0 blunder). */
  pts: number;
  /** Answers graded best. */
  best: number;
  /** Total EV lost, bb (postflop). */
  ev: number;
  /** Last answered (ms). */
  at: number;
}

export interface DeviceProgress {
  spots: Record<string, SpotStat>;
  /** 'YYYY-MM-DD' → decisions that day. */
  days: Record<string, number>;
  /** 'spotKey|hand' → +ms of the miss, or −ms when later answered right. */
  misses: Record<string, number>;
  at: number;
}

const KEY = `${LS}.progress`;
const ID_KEY = `${LS}.device`;
const OTHERS_KEY = `${LS}.others`;

const empty = (): DeviceProgress => ({ spots: {}, days: {}, misses: {}, at: 0 });

function deviceId(): string {
  try {
    let id = localStorage.getItem(ID_KEY);
    if (!id) {
      id = `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem(ID_KEY, id);
    }
    return id;
  } catch {
    return 'd-local';
  }
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, v: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* private mode / full */
  }
}

export const today = (d = new Date()): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Merge two records of the same device: counters take the max (they only grow). */
export function mergeDevice(a: DeviceProgress, b: DeviceProgress): DeviceProgress {
  const spots: Record<string, SpotStat> = { ...a.spots };
  for (const [k, s] of Object.entries(b.spots)) {
    const x = spots[k];
    spots[k] = !x || s.n > x.n ? s : x;
  }
  const days: Record<string, number> = { ...a.days };
  for (const [k, n] of Object.entries(b.days)) days[k] = Math.max(days[k] ?? 0, n);
  const misses = mergeMisses([a.misses, b.misses]);
  return { spots, days, misses, at: Math.max(a.at, b.at) };
}

function mergeMisses(maps: Array<Record<string, number>>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of maps) for (const [k, t] of Object.entries(m)) if (out[k] === undefined || Math.abs(t) > Math.abs(out[k]!)) out[k] = t;
  return out;
}

export interface Totals {
  spots: Record<string, SpotStat>;
  days: Record<string, number>;
  /** Open misses, newest first. */
  misses: Array<{ key: string; at: number }>;
}

export function totalsOf(devices: DeviceProgress[]): Totals {
  const spots: Record<string, SpotStat> = {};
  const days: Record<string, number> = {};
  for (const d of devices) {
    for (const [k, s] of Object.entries(d.spots)) {
      const x = (spots[k] ??= { n: 0, pts: 0, best: 0, ev: 0, at: 0 });
      x.n += s.n;
      x.pts += s.pts;
      x.best += s.best;
      x.ev += s.ev;
      x.at = Math.max(x.at, s.at);
    }
    for (const [k, n] of Object.entries(d.days)) days[k] = (days[k] ?? 0) + n;
  }
  const merged = mergeMisses(devices.map((d) => d.misses));
  const misses = Object.entries(merged)
    .filter(([, t]) => t > 0)
    .map(([key, at]) => ({ key, at }))
    .sort((a, b) => b.at - a.at);
  return { spots, days, misses };
}

/** Keep the record small: at most 400 open misses, cleared ones for 30 days. */
function prune(m: Record<string, number>): Record<string, number> {
  const cutoff = Date.now() - 30 * 86400_000;
  const entries = Object.entries(m).filter(([, t]) => t > 0 || -t > cutoff);
  const open = entries.filter(([, t]) => t > 0).sort((a, b) => b[1] - a[1]);
  const keepOpen = new Set(open.slice(0, 400).map(([k]) => k));
  return Object.fromEntries(entries.filter(([k, t]) => t < 0 || keepOpen.has(k)));
}

export interface Answer {
  /** Spot key: 'pf:6max/vsRFI/BB/BTN', 'po:…'. */
  spot: string;
  /** Hand key for review ('AJo', 'AsJd'). */
  hand: string;
  score: number;
  best: boolean;
  /** Counts as a miss for review (mistake or worse). */
  miss: boolean;
  evLoss?: number;
}

interface ProgressState {
  deviceId: string;
  mine: DeviceProgress;
  others: Record<string, DeviceProgress>;
  totals: Totals;
  record: (a: Answer) => void;
  /** Fold in the cloud's devices (ours included, if it has a copy). */
  absorb: (devices: Record<string, DeviceProgress>) => void;
  /** Wipe this device's record (others stay). */
  resetMine: () => void;
  onChange: (() => void) | null;
}

const id = deviceId();

export const useProgress = create<ProgressState>((set, get) => {
  const mine = read<DeviceProgress>(KEY, empty());
  const others = read<Record<string, DeviceProgress>>(OTHERS_KEY, {});
  return {
    deviceId: id,
    mine,
    others,
    totals: totalsOf([mine, ...Object.values(others)]),
    onChange: null,
    record: (a) => {
      const prev = get().mine;
      const now = Date.now();
      const s = prev.spots[a.spot] ?? { n: 0, pts: 0, best: 0, ev: 0, at: 0 };
      const spots = { ...prev.spots, [a.spot]: { n: s.n + 1, pts: s.pts + a.score, best: s.best + (a.best ? 1 : 0), ev: s.ev + (a.evLoss ?? 0), at: now } };
      const day = today();
      const days = { ...prev.days, [day]: (prev.days[day] ?? 0) + 1 };
      const mk = `${a.spot}|${a.hand}`;
      const misses = { ...prev.misses };
      if (a.miss) misses[mk] = now;
      else if ((misses[mk] ?? 0) > 0 || (!a.miss && openElsewhere(get().others, mk))) misses[mk] = -now;
      const next: DeviceProgress = { spots, days, misses: prune(misses), at: now };
      write(KEY, next);
      set({ mine: next, totals: totalsOf([next, ...Object.values(get().others)]) });
      get().onChange?.();
    },
    absorb: (devices) => {
      const { deviceId: me } = get();
      let mine = get().mine;
      const others = { ...get().others };
      for (const [k, d] of Object.entries(devices)) {
        if (k === me) mine = mergeDevice(mine, d);
        else others[k] = others[k] ? mergeDevice(others[k]!, d) : d;
      }
      write(KEY, mine);
      write(OTHERS_KEY, others);
      set({ mine, others, totals: totalsOf([mine, ...Object.values(others)]) });
    },
    resetMine: () => {
      const next = { ...empty(), at: Date.now() };
      write(KEY, next);
      set({ mine: next, totals: totalsOf([next, ...Object.values(get().others)]) });
      get().onChange?.();
    },
  };
});

function openElsewhere(others: Record<string, DeviceProgress>, key: string): boolean {
  return Object.values(others).some((d) => (d.misses[key] ?? 0) > 0);
}

/** Accuracy 0..1 of a stat (or null when unplayed). */
export const accuracy = (s: SpotStat | undefined): number | null => (s && s.n > 0 ? s.pts / s.n : null);

/** Days in a row with at least one decision, ending today (or yesterday). */
export function streak(days: Record<string, number>): number {
  let n = 0;
  const d = new Date();
  if (!days[today(d)]) d.setDate(d.getDate() - 1);
  while (days[today(d)]) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}
