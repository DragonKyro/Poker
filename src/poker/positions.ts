// Table formats and seats, in preflop action order (UTG … BB).

export type Format = '6max' | '9max';
export type Position = 'UTG' | 'UTG1' | 'UTG2' | 'LJ' | 'HJ' | 'CO' | 'BTN' | 'SB' | 'BB';

export const FORMAT_NAME: Record<Format, string> = { '6max': '6-max', '9max': '9-max' };

/** Seats in preflop action order. */
export const SEATS: Record<Format, readonly Position[]> = {
  '6max': ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  '9max': ['UTG', 'UTG1', 'UTG2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
};

export const STACK_BB = 100;
