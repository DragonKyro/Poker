// Batch-solve flops: every (spot, flop) pair without a result yet, in a pool
// of worker threads at below-normal priority, writing
// src/data/postflop/<spot>/<flop>.json as each finishes (so an interrupted
// run resumes where it stopped).
//
//   npm run solve                         # everything missing
//   npm run solve -- --spots srp-btn-bb --flops As7d2c,Ks7d2c --iters 150 --target 0.005 --max-iters 300 --workers 8 --force

import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { cpus, setPriority, constants, freemem } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';
import { FLOP_LIST } from '@/postflop/flops';
import { parseCards } from '@/poker/cards';
import { classifyFlop } from '@/poker/texture';
import { POSTFLOP_SPOTS } from '@/postflop/spots';
import type { Job } from './worker';

const here = dirname(fileURLToPath(import.meta.url));
const root = process.env.POKER_ROOT ?? resolve(here, '..', '..');
const outDir = join(root, 'src', 'data', 'postflop');

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const list = (v: string | undefined) => (v ? v.split(',').map((x) => x.trim()).filter(Boolean) : undefined);

const spots = list(arg('spots')) ?? POSTFLOP_SPOTS.map((s) => s.id);
// Round-robin over board families, so a partial run already covers every texture.
function interleave(fs: string[]): string[] {
  const byFam = new Map<string, string[]>();
  for (const f of fs) {
    const fam = classifyFlop(parseCards(f)).family;
    byFam.set(fam, [...(byFam.get(fam) ?? []), f]);
  }
  const out: string[] = [];
  for (let i = 0; out.length < fs.length; i++) for (const l of byFam.values()) if (l[i]) out.push(l[i]!);
  return out;
}
const flops = interleave(list(arg('flops')) ?? [...FLOP_LIST]);
const iterations = Number(arg('iters') ?? 120);
// Flops still above the target after `iters` get up to `max-iters` (paired and very connected boards converge slowest).
const target = Number(arg('target') ?? 0.008);
const maxIterations = Math.max(iterations, Number(arg('max-iters') ?? 220));
const force = process.argv.includes('--force');
// ≤ 0.5 GB per solve (river regrets compressed); leave a few cores and 1.5 GB for the machine.
const byMem = Math.max(1, Math.floor((freemem() / 1e9 - 1.5) / 0.5));
const workers = Math.max(1, Math.min(Number(arg('workers') ?? Math.max(1, cpus().length - 6)), byMem));

try {
  setPriority(0, constants.priority.PRIORITY_BELOW_NORMAL);
} catch {
  /* not allowed: run at normal priority */
}

const jobs: Job[] = [];
for (const spot of spots) {
  for (const flop of flops) {
    const file = join(outDir, spot, `${flop}.json`);
    if (!force && existsSync(file)) continue;
    jobs.push({ spot, flop, iterations, target, maxIterations });
  }
}
console.log(`${jobs.length} solves (${spots.length} spots × ${flops.length} flops, ${iterations} iterations) on ${Math.min(workers, jobs.length)} workers`);
if (jobs.length === 0) process.exit(0);

const t0 = Date.now();
let done = 0;
let next = 0;
const pool: Worker[] = [];

function startWorker(): void {
  const w = new Worker(join(here, 'worker.mjs'));
  pool.push(w);
  const feed = () => {
    if (next >= jobs.length) {
      void w.terminate();
      return;
    }
    w.postMessage(jobs[next++]);
  };
  w.on('message', (m: { ok: boolean; job: Job; out?: unknown; seconds?: number; memoryMB?: number; error?: string }) => {
    done++;
    if (m.ok) {
      const dir = join(outDir, m.job.spot);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, `${m.job.flop}.json`), JSON.stringify(m.out));
      const ex = (m.out as { exploit: number }).exploit;
      // Throughput so far (all workers), so the estimate settles after the first round.
      const eta = (((Date.now() - t0) / done) * (jobs.length - done)) / 60000;
      const its = (m.out as { iterations: number }).iterations;
      console.log(`[${done}/${jobs.length}] ${m.job.spot} ${m.job.flop}: ${m.seconds!.toFixed(0)} s, ${its} iterations, ${m.memoryMB!.toFixed(0)} MB, exploitability ${(ex * 100).toFixed(2)}% pot — ~${eta.toFixed(0)} min left`);
    } else {
      console.error(`[${done}/${jobs.length}] ${m.job.spot} ${m.job.flop} FAILED\n${m.error}`);
    }
    feed();
  });
  w.on('error', (e) => console.error('worker error', e));
  feed();
}

for (let i = 0; i < Math.min(workers, jobs.length); i++) startWorker();
