// A solved flop as stored in src/data/postflop/<spot>/<flop>.json (written by
// `npm run solve`). Arrays are little-endian typed arrays in base64:
// hands per player (combo indices, Uint16), and per node the strategy
// (Uint8, frequency × 255, action-major: A × n), the EV of each action
// (Int16, 0.01 bb) and the acting player's reach (Uint8, × 255 of its max).

import type { ActionKind } from '@/solver/tree';

export interface StoredAction {
  kind: ActionKind;
  id: string;
  to: number;
  frac?: number;
}

export interface StoredNode {
  path: string;
  player: 0 | 1;
  pot: number;
  streetIn: [number, number];
  actions: StoredAction[];
  freq: string;
  ev: string;
  reach: string;
}

export interface StoredFlop {
  v: 1;
  spot: string;
  board: string;
  iterations: number;
  /** Exploitability, share of the starting pot. */
  exploit: number;
  /** Each range's EV, bb. */
  ev: [number, number];
  hands: [string, string];
  nodes: StoredNode[];
}

/** Decoded, ready to use. */
export interface SolvedNode {
  path: string;
  player: 0 | 1;
  pot: number;
  streetIn: [number, number];
  actions: StoredAction[];
  /** freq[a * n + h] */
  freq: Float32Array;
  ev: Float32Array;
  reach: Float32Array;
}

export interface SolvedFlop {
  spot: string;
  board: string;
  exploit: number;
  ev: [number, number];
  hands: [Uint16Array, Uint16Array];
  nodes: SolvedNode[];
}
