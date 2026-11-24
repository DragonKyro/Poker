// Stored flop JSON → typed arrays (shared by the app and the Node scripts).

import type { SolvedFlop, StoredFlop } from './types';

function b64bytes(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const u16 = (s: string) => {
  const b = b64bytes(s);
  return new Uint16Array(b.buffer, b.byteOffset, b.byteLength / 2);
};
const i16 = (s: string) => {
  const b = b64bytes(s);
  return new Int16Array(b.buffer, b.byteOffset, b.byteLength / 2);
};

export function decodeFlop(raw: StoredFlop): SolvedFlop {
  return {
    spot: raw.spot,
    board: raw.board,
    exploit: raw.exploit,
    ev: raw.ev,
    hands: [u16(raw.hands[0]), u16(raw.hands[1])],
    nodes: raw.nodes.map((n) => ({
      path: n.path,
      player: n.player,
      pot: n.pot,
      streetIn: n.streetIn,
      actions: n.actions,
      freq: Float32Array.from(b64bytes(n.freq), (x) => x / 255),
      ev: Float32Array.from(i16(n.ev), (x) => x / 100),
      reach: Float32Array.from(b64bytes(n.reach), (x) => x / 255),
    })),
  };
}
