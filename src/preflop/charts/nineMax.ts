// 9-max, 100bb cash: the charts that involve UTG / UTG+1 / UTG+2. Every other
// 9-max spot reuses the 6-max chart with LJ in UTG's place (same number of
// players behind), see ../spots.ts.
//
// Approximate GTO (moderate rake, no ante). Sizes: opens 2.5bb; 3-bets 7.5bb
// in position, 11bb from the blinds; 4-bets 20bb vs 7.5, 24bb vs 11; 5-bet
// all-in. The opens nest: UTG ⊂ UTG+1 ⊂ UTG+2 ⊂ LJ (6-max UTG).
import type { ChartBook } from '../types';

export const NINE_MAX: ChartBook = {
  // ---------------------------------------------------------------- RFI

  'RFI/UTG': {
    raise: 'AA-77,66:0.75,55:0.5,A9s+,A8s:0.25,A5s,A4s:0.5,KTs+,K9s:0.5,QTs+,JTs,T9s:0.5,98s:0.25,AJo+,KQo:0.75',
    note: 'With eight players behind, UTG opens only about 12%: pairs, strong suited aces and broadways, AJo+. Small pairs and suited connectors mostly fold — too many players left to act to realise their equity.',
  },
  'RFI/UTG1': {
    raise: 'AA-66,55:0.75,44:0.25,A8s+,A7s:0.25,A5s,A4s:0.75,K9s+,QTs+,Q9s:0.25,JTs,J9s:0.25,T9s:0.75,98s:0.5,AJo+,ATo:0.25,KQo',
    note: 'One seat later the range widens only a little (~13%): a few more suited aces, kings and connectors. Offsuit hands stay tight — ATo is mostly a fold and KJo a clear one.',
  },
  'RFI/UTG2': {
    raise: 'AA-55,44:0.5,33:0.25,A7s+,A6s:0.5,A5s-A4s,A3s:0.25,K9s+,K8s:0.25,Q9s+,J9s+,T9s,98s:0.75,87s:0.5,AJo+,ATo:0.25,KQo,KJo:0.25',
    note: 'About 15% from UTG+2: every suited broadway, more small pairs and suited connectors. Still tight — six players behind, two of them blinds getting a price to defend.',
  },

  // ---------------------------------------------------------------- vsRFI: facing a UTG open

  'vsRFI/UTG1/UTG': {
    raise: 'AA-KK,QQ:0.75,AKs,AKo:0.75,A5s:0.25',
    call: 'QQ:0.25,JJ-99,88:0.5,77:0.25,AQs,AJs:0.5,KQs:0.5,AKo:0.25,AQo:0.25',
    note: 'The tightest open at the table, with seven players still to act: 3-bet almost only QQ+/AK, flat a few pairs and the best suited broadways. AJo and KQo are clear folds — they are dominated by UTG’s range.',
  },
  'vsRFI/UTG2/UTG': {
    raise: 'AA-KK,QQ:0.75,AKs,AQs:0.25,AKo:0.75,A5s:0.25',
    call: 'QQ:0.25,JJ-88,77:0.5,66:0.25,AQs:0.75,AJs:0.5,KQs:0.5,AKo:0.25,AQo:0.25',
    note: 'Still very tight: UTG is strong and six players can wake up behind you. Value 3-bet QQ+/AK with a sliver of A5s as a blocker bluff; flat a narrow band of pairs and AQs/AJs/KQs.',
  },
  'vsRFI/LJ/UTG': {
    raise: 'AA-KK,QQ:0.75,AKs,AQs:0.25,AKo:0.75,A5s:0.5,A4s:0.25',
    call: 'QQ:0.25,JJ-77,66:0.5,55:0.25,AQs:0.75,AJs:0.75,ATs:0.25,KQs:0.75,KJs:0.25,QJs:0.25,AKo:0.25,AQo:0.25',
    note: 'Middle position against UTG: the flatting range adds mid pairs and a few suited broadways, but offsuit hands below AQ fold. 3-bets stay value-heavy, with A5s/A4s as the bluffs because they block AA and AK.',
  },
  'vsRFI/HJ/UTG': {
    raise: 'AA-KK,QQ:0.75,JJ:0.25,AKs,AQs:0.25,KQs:0.25,AKo:0.75,A5s:0.5,A4s:0.25',
    call: 'QQ:0.25,JJ:0.75,TT-66,55:0.5,44:0.25,AQs:0.75,AJs,ATs:0.5,KQs:0.75,KJs:0.5,QJs:0.5,JTs:0.25,AKo:0.25,AQo:0.5',
    note: 'Four players behind: you can start set-mining smaller pairs and flatting suited broadways, since you will usually be in position. AQo is a mix of call and fold; AJo and KQo still fold.',
  },
  'vsRFI/CO/UTG': {
    raise: 'AA-KK,QQ:0.75,JJ:0.25,AKs,AQs:0.25,KQs:0.25,AKo:0.75,A5s:0.5,A4s:0.5',
    call: 'QQ:0.25,JJ:0.75,TT-55,44:0.5,33:0.25,AQs:0.75,AJs,ATs:0.75,KQs:0.75,KJs:0.75,KTs:0.25,QJs:0.75,QTs:0.25,JTs:0.5,T9s:0.25,AKo:0.25,AQo:0.5',
    note: 'The cutoff flats more pairs and suited broadways than the earlier seats, but the 3-bet range barely changes: UTG’s range is too strong to bluff often. Only the button and blinds are left to squeeze.',
  },
  'vsRFI/BTN/UTG': {
    raise: 'AA-KK,QQ:0.75,JJ:0.25,AKs,AQs:0.25,KQs:0.25,AKo:0.75,A5s:0.5,A4s:0.5',
    call: 'QQ:0.25,JJ:0.75,TT-44,33-22:0.5,AQs:0.75,AJs-ATs,A9s:0.5,A8s:0.25,KQs:0.75,KJs,KTs:0.75,QJs,QTs:0.75,JTs,J9s:0.25,T9s:0.75,98s:0.5,87s:0.25,AKo:0.25,AQo:0.75,AJo:0.25,KQo:0.25',
    note: 'Guaranteed position makes the button the widest flatter: all pairs, suited broadways and the better suited connectors. The 3-bet stays linear-to-polar and small — QQ+/AK for value, a few A5s/A4s/KQs as bluffs.',
  },
  'vsRFI/SB/UTG': {
    raise: 'AA-QQ,JJ:0.5,AKs,AQs:0.5,KQs:0.25,AKo,A5s:0.5,A4s:0.25',
    call: 'JJ:0.5,TT:0.5,99:0.25,AQs:0.5,AJs:0.25,KQs:0.25',
    note: 'Out of position with the big blind behind, the small blind mostly 3-bets or folds: a tight value range plus a few suited aces. Flats are rare — JJ–99 and the best suited broadways only.',
  },
  'vsRFI/BB/UTG': {
    raise: 'AA-QQ,JJ:0.5,TT:0.25,AKs,AQs:0.5,AJs:0.25,A5s-A4s:0.5,A3s-A2s:0.25,KQs:0.25,KJs:0.25,K5s:0.25,76s:0.25,65s:0.25,54s:0.25,AKo:0.75,AQo:0.25',
    call: 'JJ:0.5,TT:0.75,99-22,AQs:0.5,AJs:0.75,ATs-A6s,A5s-A4s:0.5,A3s-A2s:0.75,KQs:0.75,KJs:0.75,KTs-K6s,K5s:0.75,K4s-K2s:0.5,QJs-Q8s,Q7s:0.5,Q6s:0.25,JTs-J8s,J7s:0.5,T9s-T8s,T7s:0.5,98s-97s,96s:0.25,87s-86s,76s:0.75,75s:0.5,65s:0.75,64s:0.25,54s:0.75,43s:0.25,AKo:0.25,AQo:0.75,AJo,ATo:0.75,A9o:0.25,KQo,KJo:0.75,KTo:0.25,QJo:0.5,QTo:0.25,JTo:0.5',
    note: 'Closing the action at 3.4-to-1, the big blind defends about a quarter of hands even against UTG — mostly suited hands and pairs that play well. Weak offsuit hands (K9o, Q9o, A8o) fold: they are dominated and realise little equity out of position.',
  },

  // ---------------------------------------------------------------- vsRFI: facing a UTG+1 open

  'vsRFI/UTG2/UTG1': {
    raise: 'AA-KK,QQ:0.75,AKs,AQs:0.25,AKo:0.75,A5s:0.5',
    call: 'QQ:0.25,JJ-88,77:0.5,66:0.5,AQs:0.75,AJs:0.75,KQs:0.5,KJs:0.25,AKo:0.25,AQo:0.25',
    note: 'Directly behind an early open with six players to come, continue with under 6% of hands. Pairs and AQs/AJs/KQs flat; nearly everything offsuit folds.',
  },
  'vsRFI/LJ/UTG1': {
    raise: 'AA-KK,QQ:0.75,JJ:0.25,AKs,AQs:0.25,AKo:0.75,A5s:0.5,A4s:0.25',
    call: 'QQ:0.25,JJ:0.75,TT-77,66:0.5,55:0.25,AQs:0.75,AJs:0.75,ATs:0.25,KQs:0.75,KJs:0.25,QJs:0.25,AKo:0.25,AQo:0.5',
    note: 'UTG+1’s range is only slightly wider than UTG’s, so the lojack’s response barely changes: a value 3-bet, a few blocker bluffs, and a flatting range built on pairs and suited broadways.',
  },
  'vsRFI/HJ/UTG1': {
    raise: 'AA-KK,QQ:0.75,JJ:0.25,AKs,AQs:0.25,KQs:0.25,AKo:0.75,AQo:0.25,A5s:0.5,A4s:0.5',
    call: 'QQ:0.25,JJ:0.75,TT-66,55:0.5,44:0.25,AQs:0.75,AJs,ATs:0.5,KQs:0.75,KJs:0.5,QJs:0.5,JTs:0.25,AKo:0.25,AQo:0.5',
    note: 'From the hijack, set-mine the mid pairs and flat suited broadways; AQo now mixes in as a 3-bet too. AJo, KQo and the weak suited aces still fold.',
  },
  'vsRFI/CO/UTG1': {
    raise: 'AA-KK,QQ:0.75,JJ:0.25,AKs,AQs:0.25,AJs:0.25,KQs:0.25,AKo:0.75,AQo:0.25,A5s:0.5,A4s:0.5',
    call: 'QQ:0.25,JJ:0.75,TT-55,44:0.5,33:0.25,AQs:0.75,AJs:0.75,ATs:0.75,KQs:0.75,KJs:0.75,KTs:0.25,QJs:0.75,QTs:0.25,JTs:0.5,T9s:0.25,AKo:0.25,AQo:0.5,AJo:0.25',
    note: 'The cutoff flats a solid range of pairs, suited broadways and AQo, and 3-bets a small polar range. Only three players remain, so small pairs can start to set-mine.',
  },
  'vsRFI/BTN/UTG1': {
    raise: 'AA-KK,QQ:0.75,JJ:0.25,AKs,AQs:0.25,AJs:0.25,KQs:0.25,AKo:0.75,AQo:0.25,A5s:0.5,A4s:0.5',
    call: 'QQ:0.25,JJ:0.75,TT-44,33-22:0.5,AQs:0.75,AJs:0.75,ATs,A9s:0.5,A8s:0.25,KQs:0.75,KJs,KTs:0.75,QJs,QTs:0.75,JTs,J9s:0.5,T9s:0.75,98s:0.5,87s:0.25,AKo:0.25,AQo:0.75,AJo:0.5,KQo:0.25',
    note: 'On the button, position lets you flat widely — every pair, suited broadways, suited connectors and the better offsuit aces. The 3-bet stays narrow so the blinds can’t squeeze you off your equity cheaply.',
  },
  'vsRFI/SB/UTG1': {
    raise: 'AA-QQ,JJ:0.5,AKs,AQs:0.5,AJs:0.25,KQs:0.25,AKo,AQo:0.25,A5s:0.5,A4s:0.25',
    call: 'JJ:0.5,TT:0.5,99:0.25,AQs:0.5,AJs:0.25,KQs:0.25',
    note: '3-bet or fold from the small blind: flatting out of position with the big blind behind invites a squeeze. Value hands plus a few suited-ace blockers make up the 3-bet.',
  },
  'vsRFI/BB/UTG1': {
    raise: 'AA-QQ,JJ:0.5,TT:0.25,AKs,AQs:0.5,AJs:0.25,A5s-A4s:0.5,A3s-A2s:0.25,KQs:0.25,KJs:0.25,K5s:0.25,T9s:0.25,76s:0.25,65s:0.25,54s:0.25,AKo:0.75,AQo:0.25',
    call: 'JJ:0.5,TT:0.75,99-22,AQs:0.5,AJs:0.75,ATs-A6s,A5s-A4s:0.5,A3s-A2s:0.75,KQs:0.75,KJs:0.75,KTs-K6s,K5s:0.75,K4s-K2s:0.5,QJs-Q8s,Q7s-Q6s:0.5,JTs-J8s,J7s:0.5,T9s:0.75,T8s,T7s:0.5,98s-97s,96s:0.5,87s-86s,85s:0.25,76s:0.75,75s:0.75,65s:0.75,64s:0.5,54s:0.75,53s:0.25,43s:0.25,AKo:0.25,AQo:0.75,AJo,ATo,A9o:0.25,KQo,KJo,KTo:0.5,QJo:0.75,QTo:0.25,JTo:0.5',
    note: 'Defend roughly 26%: every pair, most suited hands, and offsuit broadways down to KTo/QJo. 3-bet about 4% — value plus suited wheel aces and connectors that play well when called.',
  },

  // ---------------------------------------------------------------- vsRFI: facing a UTG+2 open

  'vsRFI/LJ/UTG2': {
    raise: 'AA-KK,QQ:0.75,JJ:0.25,AKs,AQs:0.25,KQs:0.25,AKo:0.75,AQo:0.25,A5s:0.5,A4s:0.5',
    call: 'QQ:0.25,JJ:0.75,TT-77,66:0.5,55:0.25,AQs:0.75,AJs:0.75,ATs:0.25,KQs:0.75,KJs:0.5,QJs:0.25,AKo:0.25,AQo:0.5',
    note: 'Right behind a 15% open with five to act: a little wider than versus UTG, but still mostly pairs and strong suited broadways. AJo and KJo fold.',
  },
  'vsRFI/HJ/UTG2': {
    raise: 'AA-KK,QQ:0.75,JJ:0.5,AKs,AQs:0.5,AJs:0.25,KQs:0.25,AKo:0.75,AQo:0.25,A5s:0.5,A4s:0.5',
    call: 'QQ:0.25,JJ:0.5,TT-66,55:0.5,44:0.25,AQs:0.5,AJs:0.75,ATs:0.75,KQs:0.75,KJs:0.5,KTs:0.25,QJs:0.5,JTs:0.25,AKo:0.25,AQo:0.5,AJo:0.25',
    note: 'Against a wider opener you can 3-bet JJ and AQs more for value. The flat range adds ATs, KTs and AJo at low frequency.',
  },
  'vsRFI/CO/UTG2': {
    raise: 'AA-KK,QQ:0.75,JJ:0.5,AKs,AQs:0.5,AJs:0.25,KQs:0.25,KJs:0.25,AKo:0.75,AQo:0.25,A5s:0.5,A4s:0.5,A3s:0.25',
    call: 'QQ:0.25,JJ:0.5,TT-55,44-33:0.5,AQs:0.5,AJs:0.75,ATs,A9s:0.25,KQs:0.75,KJs:0.75,KTs:0.5,QJs:0.75,QTs:0.5,JTs:0.75,T9s:0.5,98s:0.25,AKo:0.25,AQo:0.5,AJo:0.25,KQo:0.25',
    note: 'The cutoff flats pairs, suited broadways and some suited connectors, and starts 3-betting a few more suited bluffs (A3s, KJs). KQo enters at low frequency.',
  },
  'vsRFI/BTN/UTG2': {
    raise: 'AA-KK,QQ:0.75,JJ:0.5,AKs,AQs:0.5,AJs:0.25,KQs:0.25,KJs:0.25,AKo:0.75,AQo:0.25,A5s:0.5,A4s:0.5,A3s:0.25',
    call: 'QQ:0.25,JJ:0.5,TT-22,AQs:0.5,AJs:0.75,ATs,A9s:0.75,A8s:0.5,A7s:0.25,KQs:0.75,KJs:0.75,KTs,K9s:0.5,QJs,QTs,Q9s:0.25,JTs,J9s:0.75,T9s,T8s:0.25,98s:0.75,87s:0.5,76s:0.5,65s:0.25,AKo:0.25,AQo:0.75,AJo:0.5,KQo:0.5,KJo:0.25',
    note: 'Position on a 15% opener: flat all pairs, suited aces down to A8s, suited broadways and connectors, and the best offsuit broadways. About 15% of hands continue in total.',
  },
  'vsRFI/SB/UTG2': {
    raise: 'AA-QQ,JJ:0.75,TT:0.25,AKs,AQs:0.75,AJs:0.5,ATs:0.25,KQs:0.5,KJs:0.25,AKo,AQo:0.5,A5s:0.75,A4s:0.5',
    call: 'JJ:0.25,TT:0.5,99:0.5,88:0.25,AQs:0.25,AJs:0.25,KQs:0.25',
    note: 'The small blind 3-bets to 11bb with a slightly wider, still value-heavy range, and flats only a few pairs and suited broadways. Out of position, a big 3-bet beats a passive call.',
  },
  'vsRFI/BB/UTG2': {
    raise: 'AA-QQ,JJ:0.5,TT:0.25,AKs,AQs:0.75,AJs:0.25,ATs:0.25,A5s-A4s:0.5,A3s-A2s:0.25,KQs:0.25,KJs:0.25,K9s:0.25,K5s:0.25,QJs:0.25,T9s:0.25,76s:0.25,65s:0.25,54s:0.25,AKo:0.75,AQo:0.25',
    call: 'JJ:0.5,TT:0.75,99-22,AQs:0.25,AJs:0.75,ATs:0.75,A9s-A6s,A5s-A4s:0.5,A3s-A2s:0.75,KQs:0.75,KJs:0.75,KTs,K9s:0.75,K8s-K6s,K5s:0.75,K4s-K2s:0.75,QJs:0.75,QTs-Q8s,Q7s-Q6s:0.75,Q5s:0.25,JTs-J8s,J7s:0.75,T9s:0.75,T8s,T7s:0.75,98s-97s,96s:0.5,87s-86s,85s:0.5,76s:0.75,75s,74s:0.25,65s:0.75,64s:0.75,54s:0.75,53s:0.5,43s:0.25,AKo:0.25,AQo:0.75,AJo,ATo,A9o:0.5,A8o:0.25,KQo,KJo,KTo:0.75,K9o:0.25,QJo,QTo:0.5,JTo:0.75,T9o:0.25',
    note: 'The widest defence versus an early open, around 29%: nearly all suited hands, pairs, and offsuit broadways. The 3-bet adds K9s/QJs/T9s as semi-bluffs that flop well.',
  },

  // ---------------------------------------------------------------- vs3B: UTG opened

  'vs3B/UTG/UTG1': {
    raise: 'AA,KK:0.75,AKs:0.5,AKo:0.25,A5s:0.25',
    call: 'KK:0.25,QQ-JJ,TT:0.75,99:0.25,AKs:0.5,AKo:0.75,AQs:0.75,AJs:0.25,KQs:0.5',
    note: 'A 3-bet from UTG+1 is almost pure value (QQ+/AK), so UTG folds about two thirds of its range. 4-bet KK+ with A5s as the blocker bluff; call QQ–TT, AK and the best suited broadways.',
  },
  'vs3B/UTG/UTG2': {
    raise: 'AA,KK:0.75,AKs:0.5,AKo:0.25,A5s:0.25',
    call: 'KK:0.25,QQ-JJ,TT:0.75,99:0.25,AKs:0.5,AKo:0.75,AQs:0.75,AJs:0.25,KQs:0.5',
    note: 'Same story as versus UTG+1: the 3-bettor is very strong, so fold most of the range. Calling QQ and JJ out of position is fine — they do well against AK and the few bluffs.',
  },
  'vs3B/UTG/LJ': {
    raise: 'AA,KK:0.75,AKs:0.5,AKo:0.25,A5s:0.25,A4s:0.25',
    call: 'KK:0.25,QQ-JJ,TT:0.75,99:0.5,AKs:0.5,AKo:0.75,AQs:0.75,AJs:0.5,KQs:0.5',
    note: 'Out of position against a tight 3-bet: continue with about a third of the range. 4-bet small (20bb) with KK+ and a few suited wheel aces; flat strong pairs and AK.',
  },
  'vs3B/UTG/HJ': {
    raise: 'AA,KK:0.75,QQ:0.25,AKs:0.5,AKo:0.25,A5s:0.25,A4s:0.25',
    call: 'KK:0.25,QQ:0.75,JJ-TT,99:0.5,AKs:0.5,AKo:0.75,AQs,AJs:0.5,KQs:0.5',
    note: 'The hijack 3-bets a touch wider, so UTG defends a little more: QQ starts to 4-bet sometimes and AQs always continues. Offsuit hands other than AK fold.',
  },
  'vs3B/UTG/CO': {
    raise: 'AA,KK:0.75,QQ:0.25,AKs:0.5,AKo:0.25,A5s:0.5,A4s:0.25',
    call: 'KK:0.25,QQ:0.75,JJ-TT,99:0.5,88:0.25,AKs:0.5,AKo:0.75,AQs,AJs:0.5,KQs:0.75',
    note: 'Against the cutoff’s polar 3-bet, call pairs and suited broadways that play well out of position and 4-bet a balanced mix of KK+ and A5s/A4s.',
  },
  'vs3B/UTG/BTN': {
    raise: 'AA,KK:0.75,QQ:0.25,AKs:0.5,AKo:0.25,A5s:0.5,A4s:0.25',
    call: 'KK:0.25,QQ:0.75,JJ-99,88:0.25,AKs:0.5,AKo:0.75,AQs,AJs:0.5,KQs:0.75,JTs:0.25',
    note: 'The button 3-bets a few more bluffs than earlier seats, so UTG can defend slightly wider — 99 and some JTs join the calls. Still fold AQo, AJo and KQo.',
  },
  'vs3B/UTG/SB': {
    raise: 'AA:0.75,KK:0.75,QQ:0.25,AKs:0.5,AKo:0.5,A5s:0.25',
    call: 'AA:0.25,KK:0.25,QQ:0.75,JJ-TT,99:0.5,AKs:0.5,AKo:0.5,AQs,AJs:0.5,KQs:0.75',
    note: 'Now UTG has position on the 3-bettor, so flatting improves: QQ–TT, AQs, KQs call. The 4-bet goes to 24bb; trap AA and KK by calling some of the time.',
  },
  'vs3B/UTG/BB': {
    raise: 'AA:0.75,KK:0.75,QQ:0.25,AKs:0.5,AKo:0.5,A5s:0.25,A4s:0.25',
    call: 'AA:0.25,KK:0.25,QQ:0.75,JJ-99,88:0.25,AKs:0.5,AKo:0.5,AQs,AJs:0.75,KQs:0.75,QJs:0.25,AQo:0.25',
    note: 'In position against the big blind’s 11bb 3-bet, defend more pairs and suited broadways. AK splits between calling and a 24bb 4-bet.',
  },

  // ---------------------------------------------------------------- vs3B: UTG+1 opened

  'vs3B/UTG1/UTG2': {
    raise: 'AA,KK:0.75,AKs:0.5,AKo:0.25,A5s:0.25,A4s:0.25',
    call: 'KK:0.25,QQ-JJ,TT:0.75,99:0.25,AKs:0.5,AKo:0.75,AQs:0.75,AJs:0.25,KQs:0.5',
    note: 'A 3-bet from the next seat with many players behind is very strong. Fold most of the opening range; keep QQ+, AK, the best pairs and AQs/KQs.',
  },
  'vs3B/UTG1/LJ': {
    raise: 'AA,KK:0.75,AKs:0.5,AKo:0.25,A5s:0.25,A4s:0.25',
    call: 'KK:0.25,QQ-JJ,TT:0.75,99:0.5,AKs:0.5,AKo:0.75,AQs:0.75,AJs:0.5,KQs:0.5',
    note: 'Out of position versus an in-position 3-bet: about 35% continues. Suited wheel aces are the 4-bet bluffs because they block AA/AK.',
  },
  'vs3B/UTG1/HJ': {
    raise: 'AA,KK:0.75,QQ:0.25,AKs:0.5,AKo:0.25,A5s:0.5,A4s:0.25',
    call: 'KK:0.25,QQ:0.75,JJ-TT,99:0.5,AKs:0.5,AKo:0.75,AQs,AJs:0.5,KQs:0.5',
    note: 'Defend strong pairs, AK and AQs; mix in a 4-bet with QQ for value and A5s as a bluff. Offsuit broadways besides AK fold.',
  },
  'vs3B/UTG1/CO': {
    raise: 'AA,KK:0.75,QQ:0.25,AKs:0.5,AKo:0.25,A5s:0.5,A4s:0.25',
    call: 'KK:0.25,QQ:0.75,JJ-TT,99:0.5,88:0.25,AKs:0.5,AKo:0.75,AQs,AJs:0.5,KQs:0.75',
    note: 'The cutoff’s 3-bet is wider than an early seat’s, so call a few more pairs and KQs. Keep the 4-bet small (20bb) and balanced.',
  },
  'vs3B/UTG1/BTN': {
    raise: 'AA,KK:0.75,QQ:0.25,AKs:0.5,AKo:0.25,A5s:0.5,A4s:0.5',
    call: 'KK:0.25,QQ:0.75,JJ-99,88:0.5,AKs:0.5,AKo:0.75,AQs,AJs:0.75,KQs:0.75,JTs:0.25,AQo:0.25',
    note: 'Against the button, defend a bit wider — 88, AJs and some AQo — since its 3-bet carries more bluffs. 4-bet bluffs stay with the suited aces.',
  },
  'vs3B/UTG1/SB': {
    raise: 'AA:0.75,KK:0.75,QQ:0.25,AKs:0.5,AKo:0.5,A5s:0.25,A4s:0.25',
    call: 'AA:0.25,KK:0.25,QQ:0.75,JJ-TT,99:0.5,88:0.25,AKs:0.5,AKo:0.5,AQs,AJs:0.5,KQs:0.75',
    note: 'In position against the small blind: flat pairs and suited broadways, and sometimes just call with AA/KK to keep the calling range strong. The 4-bet goes to 24bb.',
  },
  'vs3B/UTG1/BB': {
    raise: 'AA:0.75,KK:0.75,QQ:0.25,AKs:0.5,AKo:0.5,A5s:0.25,A4s:0.25',
    call: 'AA:0.25,KK:0.25,QQ:0.75,JJ-99,88:0.5,AKs:0.5,AKo:0.5,AQs,AJs:0.75,ATs:0.25,KQs:0.75,QJs:0.25,AQo:0.25',
    note: 'Position on the big blind lets you call a broader set of pairs and suited broadways. Fold the weakest offsuit hands and small suited aces that don’t 4-bet.',
  },

  // ---------------------------------------------------------------- vs3B: UTG+2 opened

  'vs3B/UTG2/LJ': {
    raise: 'AA,KK:0.75,QQ:0.25,AKs:0.5,AKo:0.25,A5s:0.25,A4s:0.25',
    call: 'KK:0.25,QQ:0.75,JJ-TT,99:0.5,AKs:0.5,AKo:0.75,AQs:0.75,AJs:0.5,KQs:0.5',
    note: 'A lojack 3-bet with five players behind is mostly value. UTG+2 folds most of its range, continuing with pairs, AK and the best suited broadways.',
  },
  'vs3B/UTG2/HJ': {
    raise: 'AA,KK:0.75,QQ:0.25,AKs:0.5,AKo:0.25,A5s:0.5,A4s:0.25',
    call: 'KK:0.25,QQ:0.75,JJ-TT,99:0.5,88:0.25,AKs:0.5,AKo:0.75,AQs,AJs:0.5,KQs:0.75',
    note: 'Out of position against an in-position 3-bet, prefer calling with hands that make strong pairs or sets, and 4-bet KK+ with a few suited-ace bluffs.',
  },
  'vs3B/UTG2/CO': {
    raise: 'AA,KK:0.75,QQ:0.25,AKs:0.5,AKo:0.25,A5s:0.5,A4s:0.5',
    call: 'KK:0.25,QQ:0.75,JJ-99,88:0.25,AKs:0.5,AKo:0.75,AQs,AJs:0.75,KQs:0.75,JTs:0.25',
    note: 'The cutoff’s 3-bet range widens against a 15% open, so UTG+2 can defend 99, AJs and some JTs. Small pairs and offsuit hands below AK still fold.',
  },
  'vs3B/UTG2/BTN': {
    raise: 'AA,KK:0.75,QQ:0.25,AKs:0.5,AKo:0.25,A5s:0.5,A4s:0.5,A3s:0.25',
    call: 'KK:0.25,QQ:0.75,JJ-99,88:0.5,77:0.25,AKs:0.5,AKo:0.75,AQs,AJs:0.75,ATs:0.25,KQs:0.75,KJs:0.25,JTs:0.25,AQo:0.25',
    note: 'The button 3-bets the widest of the in-position seats, so continue with around 40%: more pairs, suited broadways and some AQo. Bluff-4-bet with A5s–A3s.',
  },
  'vs3B/UTG2/SB': {
    raise: 'AA:0.75,KK:0.75,QQ:0.25,AKs:0.5,AKo:0.5,A5s:0.25,A4s:0.25',
    call: 'AA:0.25,KK:0.25,QQ:0.75,JJ-99,88:0.25,AKs:0.5,AKo:0.5,AQs,AJs:0.75,KQs:0.75,AQo:0.25',
    note: 'In position against the small blind’s 11bb 3-bet, flatting gains value: pairs, AQs/AJs/KQs and some AQo call. Slowplay AA and KK part of the time.',
  },
  'vs3B/UTG2/BB': {
    raise: 'AA:0.75,KK:0.75,QQ:0.25,AKs:0.5,AKo:0.5,A5s:0.25,A4s:0.25,A3s:0.25',
    call: 'AA:0.25,KK:0.25,QQ:0.75,JJ-99,88:0.5,77:0.25,AKs:0.5,AKo:0.5,AQs,AJs:0.75,ATs:0.25,KQs:0.75,KJs:0.25,QJs:0.25,JTs:0.25,AQo:0.25',
    note: 'The big blind 3-bets widest versus UTG+2, and you have position: defend mid pairs and most suited broadways. 4-bet to 24bb with value and suited-ace blockers.',
  },

  // ---------------------------------------------------------------- vs4B: UTG 4-bet our 3-bet

  'vs4B/UTG1/UTG': {
    allin: 'AA:0.75,KK:0.75,QQ:0.25,AKs:0.25',
    call: 'AA:0.25,KK:0.25,QQ:0.5,JJ:0.25,AKs:0.5,AKo:0.25',
    note: 'UTG’s 4-bet is KK+, some AK and a few A5s. Stack off with AA/KK, mix QQ and AKs between a call and a jam, and fold most AKo.',
  },
  'vs4B/UTG2/UTG': {
    allin: 'AA:0.75,KK:0.75,QQ:0.25,AKs:0.25',
    call: 'AA:0.25,KK:0.25,QQ:0.5,JJ:0.25,AKs:0.5,AKo:0.25',
    note: 'Against the tightest 4-bet, even QQ and AK are close. Jam or call the premiums; the suited-ace bluffs in your 3-bet fold.',
  },
  'vs4B/LJ/UTG': {
    allin: 'AA:0.75,KK:0.75,QQ:0.25,AKs:0.25',
    call: 'AA:0.25,KK:0.25,QQ:0.5,JJ:0.25,AKs:0.5,AKo:0.25',
    note: 'In position versus a 20bb 4-bet you can call some strong hands rather than jam; AA and KK sometimes flat to protect the calling range.',
  },
  'vs4B/HJ/UTG': {
    allin: 'AA:0.75,KK:0.75,QQ:0.25,AKs:0.25',
    call: 'AA:0.25,KK:0.25,QQ:0.5,JJ:0.5,AKs:0.5,AKo:0.25',
    note: 'Continue with roughly half your 3-bets: AA/KK jam or trap, QQ/JJ/AKs mostly call. A5s and A4s fold — they were bluffs.',
  },
  'vs4B/CO/UTG': {
    allin: 'AA:0.75,KK:0.75,QQ:0.25,AKs:0.25',
    call: 'AA:0.25,KK:0.25,QQ:0.5,JJ:0.5,AKs:0.5,AKo:0.25',
    note: 'UTG’s 4-bet range is very strong, so the cutoff gives up most AKo and all bluffs. Premium pairs continue.',
  },
  'vs4B/BTN/UTG': {
    allin: 'AA:0.75,KK:0.75,QQ:0.25,AKs:0.25',
    call: 'AA:0.25,KK:0.25,QQ:0.5,JJ:0.5,AKs:0.5,AKo:0.25',
    note: 'Even with position, a UTG 4-bet beats most of your range. Call or jam AA–QQ and AKs; AKo mostly folds.',
  },
  'vs4B/SB/UTG': {
    allin: 'AA-KK,QQ:0.25,AKs:0.5,AKo:0.25',
    call: 'QQ:0.5,JJ:0.25,AKs:0.25,AKo:0.25',
    note: 'Out of position facing a 24bb 4-bet, prefer the jam over a call: AA/KK always shove, QQ and AK split between jam, call and fold.',
  },
  'vs4B/BB/UTG': {
    allin: 'AA-KK,QQ:0.25,AKs:0.5,AKo:0.25',
    call: 'QQ:0.5,JJ:0.25,AKs:0.25,AKo:0.25',
    note: 'The big blind is out of position with a low stack-to-pot ratio, so it jams its strong hands rather than call. Bluff 3-bets fold.',
  },

  // ---------------------------------------------------------------- vs4B: UTG+1 4-bet our 3-bet

  'vs4B/UTG2/UTG1': {
    allin: 'AA:0.75,KK:0.75,QQ:0.25,AKs:0.25',
    call: 'AA:0.25,KK:0.25,QQ:0.5,JJ:0.25,AKs:0.5,AKo:0.5',
    note: 'UTG+1’s 4-bet is slightly wider than UTG’s, so AKo can call more. AA/KK jam most of the time.',
  },
  'vs4B/LJ/UTG1': {
    allin: 'AA:0.75,KK:0.75,QQ:0.25,AKs:0.25',
    call: 'AA:0.25,KK:0.25,QQ:0.5,JJ:0.25,AKs:0.5,AKo:0.5',
    note: 'Continue with the premium pairs and AK; the blocker bluffs fold. In position, calling keeps the pot manageable with QQ and AK.',
  },
  'vs4B/HJ/UTG1': {
    allin: 'AA:0.75,KK:0.75,QQ:0.25,AKs:0.25',
    call: 'AA:0.25,KK:0.25,QQ:0.5,JJ:0.5,AKs:0.5,AKo:0.5',
    note: 'QQ and JJ mostly call, AK splits between call and fold, AA and KK stack off. Fold everything else.',
  },
  'vs4B/CO/UTG1': {
    allin: 'AA:0.75,KK:0.75,QQ:0.25,AKs:0.25',
    call: 'AA:0.25,KK:0.25,QQ:0.5,JJ:0.5,AKs:0.5,AKo:0.5',
    note: 'With position on the 4-bettor, flat some strong hands and jam the rest of the premiums.',
  },
  'vs4B/BTN/UTG1': {
    allin: 'AA:0.75,KK:0.75,QQ:0.25,AKs:0.25',
    call: 'AA:0.25,KK:0.25,QQ:0.5,JJ:0.5,AKs:0.5,AKo:0.5',
    note: 'The button 3-bets the widest, so it folds the largest share to a 4-bet. Keep only the hands that beat a strong early-position 4-bet.',
  },
  'vs4B/SB/UTG1': {
    allin: 'AA-KK,QQ:0.5,AKs:0.5,AKo:0.25',
    call: 'QQ:0.25,JJ:0.25,AKs:0.25,AKo:0.5',
    note: 'Out of position, shove for value with AA/KK and much of QQ/AKs; call a little with AKo and JJ.',
  },
  'vs4B/BB/UTG1': {
    allin: 'AA-KK,QQ:0.5,AKs:0.5,AKo:0.25',
    call: 'QQ:0.25,JJ:0.25,AKs:0.25,AKo:0.5',
    note: 'Jam or fold dominates out of position against a 24bb 4-bet; QQ+ and AK continue, everything else folds.',
  },

  // ---------------------------------------------------------------- vs4B: UTG+2 4-bet our 3-bet

  'vs4B/LJ/UTG2': {
    allin: 'AA:0.75,KK:0.75,QQ:0.25,AKs:0.5',
    call: 'AA:0.25,KK:0.25,QQ:0.75,JJ:0.5,AKs:0.5,AKo:0.5',
    note: 'UTG+2’s 4-bet range is wider, so QQ always continues and AKs jams more. JJ is a close call/fold.',
  },
  'vs4B/HJ/UTG2': {
    allin: 'AA:0.75,KK:0.75,QQ:0.25,AKs:0.5',
    call: 'AA:0.25,KK:0.25,QQ:0.75,JJ:0.5,AKs:0.5,AKo:0.5',
    note: 'Continue with QQ+, AK and half your JJ; jam AA/KK most of the time and occasionally trap.',
  },
  'vs4B/CO/UTG2': {
    allin: 'AA:0.75,KK:0.75,QQ:0.25,AKs:0.5',
    call: 'AA:0.25,KK:0.25,QQ:0.75,JJ:0.5,AKs:0.5,AKo:0.5',
    note: 'In position against a 20bb 4-bet, calling with QQ, JJ and AK realises equity well; the bluffs fold.',
  },
  'vs4B/BTN/UTG2': {
    allin: 'AA:0.75,KK:0.75,QQ:0.25,AKs:0.5',
    call: 'AA:0.25,KK:0.25,QQ:0.75,JJ:0.5,AKs:0.5,AKo:0.5',
    note: 'The button defends its strong 3-bets and folds the suited-ace and connector bluffs. AKo calls half the time.',
  },
  'vs4B/SB/UTG2': {
    allin: 'AA-KK,QQ:0.5,AKs:0.75,AKo:0.25',
    call: 'QQ:0.5,JJ:0.5,AKs:0.25,AKo:0.5',
    note: 'Out of position, AA/KK/AKs mostly jam; QQ splits jam and call; JJ and AKo call at times. Everything else folds.',
  },
  'vs4B/BB/UTG2': {
    allin: 'AA-KK,QQ:0.5,AKs:0.75,AKo:0.25',
    call: 'QQ:0.5,JJ:0.5,AKs:0.25,AKo:0.5',
    note: 'Against UTG+2’s wider 4-bet the big blind continues QQ+ always, AK almost always, and JJ half the time.',
  },
};
