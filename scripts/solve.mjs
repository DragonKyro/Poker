// `npm run solve`: bundle the solver pipeline (scripts/solve/*.ts, with the
// app's `@/` imports) into plain ESM with esbuild — it ships with Vite — and
// run it under Node with worker threads. Arguments pass through to main.ts.

import { build } from 'esbuild';
import { spawn } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, '.solve');

await build({
  entryPoints: { main: join(root, 'scripts/solve/main.ts'), worker: join(root, 'scripts/solve/worker.ts') },
  outdir: out,
  outExtension: { '.js': '.mjs' },
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  alias: { '@': join(root, 'src') },
  logLevel: 'warning',
});

const child = spawn(process.execPath, ['--max-old-space-size=4096', join(out, 'main.mjs'), ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, POKER_ROOT: root },
});
child.on('exit', (code) => process.exit(code ?? 0));
