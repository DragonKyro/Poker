// The app's icons: a fanned A♠ K♥ over a red poker chip, on green felt with
// a gold rim. Writes public/favicon.svg and rasterises the same art with
// headless Chrome into the PWA / home-screen PNGs (no dependencies; set
// CHROME to the browser if it isn't found).
//
//   node scripts/make-icons.mjs

import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public');

// Suit shapes from src/ui/cards/cardArt.ts (a 100 × 100 box) and the stroked rank glyphs (10 × 14).
const SPADE = 'M50 3C62 22 96 39 96 62C96 77 85 85 73 85C64 85 57 80 53 73C54 84 58 92 67 98H33C42 92 46 84 47 73C43 80 36 85 27 85C15 85 4 77 4 62C4 39 38 22 50 3Z';
const HEART = 'M50 94C24 74 3 57 3 32C3 15 15 5 29 5C39 5 46 11 50 20C54 11 61 5 71 5C85 5 97 15 97 32C97 57 76 74 50 94Z';
const GLYPH_A = 'M0.8 14L5 0.2L9.2 14M2.3 9.2H7.7';
const GLYPH_K = 'M1.2 0.2V14M8.8 0.2L1.5 8.4M4 5.7L9.2 14';
const INK = '#1b2132';
const RED = '#d22e3e';

function card({ x, y, rot, cx, cy, glyph, suit, color }) {
  return (
    `<g transform="rotate(${rot} ${cx} ${cy})">` +
    `<rect x="${x + 1.6}" y="${y + 2.4}" width="38" height="55" rx="5" fill="#03140e" opacity=".38"/>` +
    `<rect x="${x}" y="${y}" width="38" height="55" rx="5" fill="url(#card)" stroke="#0b2a1f" stroke-opacity=".3" stroke-width=".9"/>` +
    `<path transform="translate(${x + 4} ${y + 4}) scale(.78)" d="${glyph}" fill="none" stroke="${color}" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path transform="translate(${x + 3.6} ${y + 16.5}) scale(.085)" d="${suit}" fill="${color}"/>` +
    `<path transform="translate(${x + 12} ${y + 20}) scale(.22)" d="${suit}" fill="${color}"/>` +
    `</g>`
  );
}

function chip(cx, cy, r) {
  let inserts = '';
  for (let k = 0; k < 6; k++) {
    const a = ((k * 60 + 30) * Math.PI) / 180;
    const x = cx + r * 0.8 * Math.sin(a);
    const y = cy - r * 0.8 * Math.cos(a);
    inserts += `<rect x="${(x - 2.4).toFixed(2)}" y="${(y - 4).toFixed(2)}" width="4.8" height="8" rx="1.2" fill="#f6efe0" transform="rotate(${k * 60 + 30} ${x.toFixed(2)} ${y.toFixed(2)})"/>`;
  }
  return (
    `<circle cx="${cx + 1.2}" cy="${cy + 2}" r="${r}" fill="#03140e" opacity=".4"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#chip)" stroke="#5e0f1a" stroke-width="1"/>` +
    inserts +
    `<circle cx="${cx}" cy="${cy}" r="${r * 0.56}" fill="#f6efe0" stroke="#f2c14e" stroke-width="1.3"/>` +
    `<path transform="translate(${cx - r * 0.32} ${cy - r * 0.33}) scale(${(r * 0.64) / 100})" d="${SPADE}" fill="${INK}"/>`
  );
}

/** The art in a 100 × 100 box. `bleed`: a full square (maskable / iOS) with the art scaled into the safe zone. */
function svg({ bleed = false } = {}) {
  const art =
    card({ x: 17, y: 17, rot: -13, cx: 36, cy: 72, glyph: GLYPH_K, suit: HEART, color: RED }) +
    card({ x: 40, y: 15, rot: 11, cx: 59, cy: 70, glyph: GLYPH_A, suit: SPADE, color: INK }) +
    chip(71, 73, 17);
  const defs =
    `<defs>` +
    `<radialGradient id="felt" cx=".5" cy=".38" r=".78"><stop offset="0" stop-color="#22906a"/><stop offset=".62" stop-color="#12503f"/><stop offset="1" stop-color="#082a21"/></radialGradient>` +
    `<linearGradient id="card" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="#fffef8"/><stop offset="1" stop-color="#ece3cd"/></linearGradient>` +
    `<linearGradient id="chip" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e5485a"/><stop offset="1" stop-color="#9b1f2e"/></linearGradient>` +
    `</defs>`;
  const bg = bleed
    ? `<rect width="100" height="100" fill="url(#felt)"/>`
    : `<rect width="100" height="100" rx="22" fill="url(#felt)"/><rect x="3.5" y="3.5" width="93" height="93" rx="19" fill="none" stroke="#f2c14e" stroke-opacity=".4" stroke-width="1.4"/>`;
  const body = bleed ? `<g transform="translate(12 12) scale(.76)">${art}</g>` : art;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${defs}${bg}${body}</svg>`;
}

function findChrome() {
  const candidates = [
    process.env.CHROME,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].filter(Boolean);
  const found = candidates.find((p) => existsSync(p));
  if (!found) throw new Error('No Chrome found; set CHROME to a Chrome / Edge / Chromium binary.');
  return found;
}

function rasterise(chrome, markup, size, file, tmp) {
  const html = join(tmp, `${size}.html`);
  writeFileSync(html, `<!doctype html><html><body style="margin:0;background:transparent">${markup.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  execFileSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', '--default-background-color=00000000', `--window-size=${size},${size}`, `--screenshot=${file}`, pathToFileURL(html).href], { stdio: 'ignore' });
}

const chrome = findChrome();
const tmp = mkdtempSync(join(tmpdir(), 'poker-icons-'));
try {
  writeFileSync(join(out, 'favicon.svg'), svg());
  rasterise(chrome, svg(), 192, join(out, 'icon-192.png'), tmp);
  rasterise(chrome, svg(), 512, join(out, 'icon-512.png'), tmp);
  rasterise(chrome, svg({ bleed: true }), 512, join(out, 'icon-maskable-512.png'), tmp);
  rasterise(chrome, svg({ bleed: true }), 180, join(out, 'apple-touch-icon.png'), tmp);
  if (process.env.ICON_PREVIEW) {
    rasterise(chrome, svg(), 32, join(tmp, 'preview-32.png'), tmp);
    copyFileSync(join(tmp, 'preview-32.png'), process.env.ICON_PREVIEW);
  }
  console.log('icons written to', out);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
