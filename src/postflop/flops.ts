// The flops the solver covers: a hand-picked set spread over every board
// family, rainbow and two-tone, high and low. Drills and the board lab weight
// each flop by how many real flops its family stands for, so aggregates
// reflect how often textures actually come up.

import { parseCards } from '@/poker/cards';
import { classifyFlop, type Family } from '@/poker/texture';

export const FLOP_LIST: readonly string[] = [
  // ace-high
  'As7d2c',
  'AsKd5c',
  'AsTd6c',
  'Ad5c4h',
  'AsJs4d',
  'Ah8h3c',
  // broadway
  'KsQd6c',
  'QsJd4c',
  'KdJcTs',
  'KhTh5c',
  'QsJs9d',
  // king / queen high
  'Ks7d2c',
  'Qd8c3s',
  'Kh9h4c',
  'Qs6s2d',
  // connected
  'Ts9d7c',
  '8s7d5c',
  '6d5c4s',
  '9h8h6c',
  '7c6c4h',
  // middling
  'Js6d3c',
  'Ts5d2c',
  'Jh7h2c',
  '9s5s2d',
  // low
  '8s4d2c',
  '7d3c2s',
  '8h5h2c',
  // paired
  'KsKd7c',
  'Qs5d5c',
  '8s8d3c',
  'As4d4c',
  'Th6h6c',
  // monotone
  'Ks8s3s',
  'AhTh4h',
  'Jd7d4d',
  '8c6c5c',
];

export const flopsOf = (family: Family): string[] => FLOP_LIST.filter((f) => classifyFlop(parseCards(f)).family === family);
