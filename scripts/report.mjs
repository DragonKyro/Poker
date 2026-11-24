// `npm run report`: bundle scripts/report/main.ts (with the app's `@/`
// imports) with esbuild and run it under Node. See that file.

import { build } from 'esbuild';
import { spawn } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, '.solve', 'report.mjs');
await build({ entryPoints: [join(root, 'scripts/report/main.ts')], outfile: out, bundle: true, platform: 'node', format: 'esm', target: 'node20', alias: { '@': join(root, 'src') }, logLevel: 'warning' });
const child = spawn(process.execPath, [out, ...process.argv.slice(2)], { stdio: 'inherit', env: { ...process.env, POKER_ROOT: root } });
child.on('exit', (code) => process.exit(code ?? 0));
