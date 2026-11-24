// Small synthesized sounds (Web Audio, no files): a card snapping down,
// chips clicking, a right or wrong answer. Browsers only allow audio after a
// user gesture, so the context is created on the first pointer press.

import { usePrefs } from '@/store/prefsStore';

export type Sound = 'card' | 'chips' | 'fold' | 'best' | 'good' | 'miss' | 'tap';

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    try {
      ctx = new C();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
  return ctx;
}

if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', () => audio(), { once: true, capture: true });
}

function tone(a: AudioContext, freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.07): void {
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(g).connect(a.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

/** A short filtered noise burst: card on felt, or a chip click at a high centre frequency. */
function snap(a: AudioContext, start: number, gain = 0.2, freq = 2200, len = 0.05): void {
  const n = Math.floor(a.sampleRate * len);
  const buf = a.createBuffer(1, n, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 3;
  const src = a.createBufferSource();
  src.buffer = buf;
  const filter = a.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = 0.8;
  const g = a.createGain();
  g.gain.value = gain;
  src.connect(filter).connect(g).connect(a.destination);
  src.start(start);
}

/** Clay chips: a few short, bright clicks. */
function chips(a: AudioContext, start: number): void {
  for (let i = 0; i < 3; i++) {
    const t = start + i * 0.038 + Math.random() * 0.012;
    snap(a, t, 0.16, 4200 + Math.random() * 1600, 0.025);
    tone(a, 2900 + Math.random() * 600, t, 0.035, 'triangle', 0.012);
  }
}

export function playSound(kind: Sound): void {
  if (!usePrefs.getState().sound) return;
  const a = audio();
  if (!a || a.state !== 'running') return;
  const t = a.currentTime + 0.01;
  switch (kind) {
    case 'card':
      snap(a, t, 0.16);
      break;
    case 'tap':
      snap(a, t, 0.08, 3200);
      break;
    case 'fold':
      snap(a, t, 0.1, 1300, 0.08);
      break;
    case 'chips':
      chips(a, t);
      break;
    case 'best':
      [660, 880, 1320].forEach((f, i) => tone(a, f, t + i * 0.07, 0.26, 'triangle', 0.055));
      break;
    case 'good':
      [587, 784].forEach((f, i) => tone(a, f, t + i * 0.08, 0.24, 'triangle', 0.05));
      break;
    case 'miss':
      tone(a, 311, t, 0.2, 'triangle', 0.05);
      tone(a, 233, t + 0.15, 0.36, 'triangle', 0.05);
      break;
  }
}
