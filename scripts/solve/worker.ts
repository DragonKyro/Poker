// One solve per job: build the spot's ranges and tree on the flop, run DCFR,
// measure exploitability, and send back the flop decisions in the stored
// format (src/postflop/types.ts).

import { parentPort } from 'node:worker_threads';
import { parseCards } from '@/poker/cards';
import { POSTFLOP_SPOTS, spotRanges } from '@/postflop/spots';
import type { StoredFlop, StoredNode } from '@/postflop/types';
import { Solver } from '@/solver/solver';

export interface Job {
  spot: string;
  flop: string;
  /** Iterations to run first. */
  iterations: number;
  /** Keep going in chunks of 40 (up to `maxIterations`) until exploitability is at most this share of the pot. */
  target: number;
  maxIterations: number;
}

const b64 = (a: ArrayBufferView) => Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString('base64');

function solve(job: Job): { out: StoredFlop; seconds: number; memoryMB: number } {
  const spot = POSTFLOP_SPOTS.find((s) => s.id === job.spot);
  if (!spot) throw new Error(`unknown spot ${job.spot}`);
  const t0 = Date.now();
  const s = new Solver({ board: parseCards(job.flop), ranges: spotRanges(spot), tree: spot.tree, avgStreets: 2, compressRiver: true });
  s.run(job.iterations);
  let exploit = s.exploitability();
  while (exploit > job.target && s.iteration < job.maxIterations) {
    s.run(Math.min(40, job.maxIterations - s.iteration));
    exploit = s.exploitability();
  }
  const ev = s.evaluateAll();

  const nodes: StoredNode[] = [];
  for (const nd of s.nodes) {
    if (nd.street !== 0 || nd.actions.length < 2) continue;
    const reach = s.reach(nd.id);
    const evs = s.actionEV(nd.id);
    if (!reach || !evs) continue;
    let max = 0;
    for (const r of reach) max = Math.max(max, r);
    if (max <= 0) continue;
    const n = s.n[nd.player]!;
    const A = nd.actions.length;
    const st = s.strategy(nd.id);
    const freq = new Uint8Array(A * n);
    const evq = new Int16Array(A * n);
    for (let h = 0; h < n; h++) {
      // Quantise each hand's mix so it still sums to 255.
      let left = 255;
      let bestA = 0;
      for (let a = 0; a < A; a++) {
        const q = Math.round(st[a * n + h]! * 255);
        freq[a * n + h] = q;
        left -= q;
        if (st[a * n + h]! > st[bestA * n + h]!) bestA = a;
      }
      freq[bestA * n + h] = Math.max(0, freq[bestA * n + h]! + left);
      for (let a = 0; a < A; a++) evq[a * n + h] = Math.max(-32767, Math.min(32767, Math.round(evs[a * n + h]! * 100)));
    }
    const rq = new Uint8Array(n);
    for (let h = 0; h < n; h++) rq[h] = Math.round((reach[h]! / max) * 255);
    nodes.push({
      path: nd.path,
      player: nd.player,
      pot: nd.pot,
      streetIn: nd.streetIn,
      actions: nd.actions.map((a) => ({ kind: a.kind, id: a.id, to: a.to, ...(a.frac !== undefined ? { frac: a.frac } : {}) })),
      freq: b64(freq),
      ev: b64(evq),
      reach: b64(rq),
    });
  }
  const out: StoredFlop = {
    v: 1,
    spot: job.spot,
    board: job.flop,
    iterations: s.iteration,
    exploit: Number(exploit.toFixed(5)),
    ev: [Number(ev[0].toFixed(3)), Number(ev[1].toFixed(3))],
    hands: [b64(s.hands[0]), b64(s.hands[1])],
    nodes,
  };
  return { out, seconds: (Date.now() - t0) / 1000, memoryMB: s.memory / 1e6 };
}

parentPort!.on('message', (job: Job) => {
  try {
    parentPort!.postMessage({ ok: true, job, ...solve(job) });
  } catch (e) {
    parentPort!.postMessage({ ok: false, job, error: (e as Error).stack ?? String(e) });
  }
});
