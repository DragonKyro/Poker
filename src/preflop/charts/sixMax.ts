// 6-max, 100bb cash: approximate GTO preflop charts (see ../types.ts for the format).
//
// Modelled on modern 100bb 6-max solver output with moderate rake: opens
// 2.5bb (SB 3bb raise-or-fold), 3-bets 7.5bb in position and 11bb from the
// blinds (9bb BB vs SB), 4-bets 20 / 24 / 22bb, 5-bets all-in. Edges mix.
import type { ChartBook } from '../types';

export const SIX_MAX: ChartBook = {
  // ---------------------------------------------------------------- RFI: folded to the hero

  'RFI/UTG': {
    raise: '77+,66:0.6,55:0.4,44:0.1,33:0.1,A2s+,K8s+,K7s:0.75,K5s:0.75,Q9s+,JTs,T9s,AJo+,ATo,KQo,KJo,KTo:0.25,QJo:0.5',
    note: 'Five players behind: open tight. Every suited ace, suited kings to K7s, the suited broadways and T9s, and the offsuit broadways down to ATo / KJo. Small pairs and suited connectors mostly fold — with rake they can’t win enough in multiway or 3-bet pots.',
  },
  'RFI/HJ': {
    raise:
      '44+,33:0.75,22:0.25,A2s+,K6s+,K5s:0.25,Q9s+,Q8s:0.75,J9s+,J8s:0.5,T8s+,98s,87s,76s,65s:0.5,ATo+,A9o:0.25,KJo+,KTo:0.5,QJo:0.75',
    note: 'A little wider than UTG: nearly every pair, more suited kings and connectors, and KTo / QJo start to mix in with the offsuit hands.',
  },
  'RFI/CO': {
    raise:
      '44+,33:0.4,22:0.15,A2s+,K3s+,Q7s+,Q6s:0.5,J8s+,J7s:0.5,T8s+,98s,97s:0.4,87s:0.4,76s:0.5,65s:0.5,54s:0.5,A8o+,A7o:0.5,A5o,KTo+,K9o:0.5,QTo+,JTo',
    note: 'Only three players behind: nearly every suited king, most suited queens, every offsuit ace down to A8o (plus A5o for its wheel and blocker value) and all the offsuit broadways. Low pairs and gapped suited connectors are the first hands to go.',
  },
  'RFI/BTN': {
    raise:
      '22+,A2s+,K2s+,Q4s+,Q3s:0.5,Q2s:0.25,J5s+,J4s:0.25,T6s+,T5s:0.25,96s+,95s:0.5,85s+,75s+,74s:0.75,64s+,63s:0.5,53s+,43s:0.5,A5o+,A4o:0.5,A3o:0.25,A2o:0.25,K8o+,K7o:0.25,Q9o+,Q8o:0.25,J9o+,J8o:0.5,T9o,T8o:0.5,98o:0.5',
    note: 'Only the blinds behind and position on both: open over 40%. Any suited king or ace, most suited hands with a card above 8, nearly every offsuit ace, and offsuit broadways and connectors down to T8o.',
  },
  'RFI/SB': {
    raise:
      '22+,A2s+,K2s+,Q4s+,Q3s:0.25,J6s+,J5s:0.5,T6s+,96s+,95s:0.25,85s+,75s+,64s+,54s,53s:0.25,A4o+,A3o:0.25,A2o:0.25,K9o+,K8o:0.75,QTo+,Q9o:0.75,JTo,J9o:0.5,T9o:0.75',
    note: 'Raise-or-fold to 3bb against the big blind alone. You are out of position for the whole hand, so the range is a little tighter than the button and keeps the suited, playable hands.',
  },

  // ---------------------------------------------------------------- vsRFI: one open in front (raise = 3-bet)

  'vsRFI/HJ/UTG': {
    raise: 'QQ+,JJ:0.5,TT:0.25,AKs,AQs:0.5,AJs:0.25,A5s:0.75,A4s:0.5,A3s:0.25,KQs:0.5,KJs:0.25,AKo,AQo:0.25,KQo:0.25,76s:0.25,65s:0.25',
    call: 'JJ:0.5,TT:0.75,99:0.75,88:0.5,77:0.5,66:0.25,AQs:0.5,AJs:0.75,ATs:0.75,KQs:0.5,KJs:0.5,KTs:0.25,QJs:0.5,QTs:0.25,JTs:0.5,T9s:0.25,AQo:0.25',
    note: 'UTG’s range is strong and three players are still behind you. Mostly 3-bet or fold: value from QQ+ and AK, low suited aces as blocker bluffs, and only a thin flat with pairs and suited broadways.',
  },
  'vsRFI/CO/UTG': {
    raise:
      'QQ+,JJ:0.75,TT:0.5,99:0.25,AKs,AQs:0.75,AJs:0.6,ATs:0.5,A9s:0.25,A5s,A4s:0.75,A3s:0.5,KQs:0.75,KJs:0.5,KTs:0.4,QJs:0.4,QTs:0.25,JTs:0.25,AKo,AQo:0.75,AJo:0.25,KQo:0.5,K9s:0.25,T9s:0.25,76s:0.25,65s:0.25,54s:0.25',
    call: 'JJ:0.25,TT:0.5,99:0.6,88:0.6,77:0.5,66:0.4,55:0.25,AQs:0.25,AJs:0.4,ATs:0.4,KQs:0.25,KJs:0.4,KTs:0.3,QJs:0.4,QTs:0.3,JTs:0.4,T9s:0.25,AQo:0.25',
    note: 'Facing the tightest open with the button and blinds behind: 3-bet or fold. A polarised 3-bet (premiums, A5s–A3s, suited broadways and wheel connectors) and only a thin flat of pairs and suited broadways.',
  },
  'vsRFI/BTN/UTG': {
    raise: 'QQ+,JJ:0.6,TT:0.3,AKs,AQs:0.75,AJs:0.5,A9s:0.25,A8s:0.5,A7s:0.5,A5s:0.9,A4s:0.7,A3s:0.5,KQs:0.6,KJs:0.5,QJs:0.25,K9s:0.6,AKo,AQo:0.7,KQo:0.75,76s:0.25,65s:0.25,54s:0.25',
    call: 'JJ:0.4,TT:0.7,99-66,55:0.75,44:0.5,33:0.5,22:0.5,AQs:0.25,AJs:0.5,ATs,A9s:0.5,A8s:0.5,A7s:0.5,KQs:0.4,KJs:0.5,KTs:0.75,K9s:0.2,QJs:0.75,QTs:0.75,JTs,J9s:0.5,T9s:0.75,98s:0.75,87s:0.5,76s:0.5,65s:0.5,AQo:0.3,AJo:0.25,KQo:0.25',
    note: 'The button flats more than any other seat — position makes pairs and suited hands profitable calls — but still 3-bets about 7%: value, KQo, and suited aces and kings that block UTG’s best hands.',
  },
  'vsRFI/SB/UTG': {
    raise: 'QQ+,JJ:0.75,TT:0.5,99:0.25,AKs,AQs,AJs:0.75,ATs:0.5,A5s:0.75,A4s:0.5,A3s:0.25,KQs:0.75,KJs:0.5,QJs:0.25,AKo,AQo:0.5,KQo:0.25',
    call: 'JJ:0.25,TT:0.25,99:0.25,88:0.25,AJs:0.25,KQs:0.25,KJs:0.25,QJs:0.25,JTs:0.25',
    note: 'Out of position with the big blind still to act: 3-bet big (11bb) or fold. A small flat with pairs and suited broadways is all that survives.',
  },
  'vsRFI/BB/UTG': {
    raise: 'QQ+,JJ:0.5,AKs,AQs:0.5,AJs:0.25,A5s:0.5,A4s:0.5,A3s:0.25,KQs:0.25,K5s:0.25,AKo,AQo:0.5,76s:0.25,65s:0.25,54s:0.25',
    call:
      'JJ:0.5,TT-22,AQs:0.5,AJs:0.75,ATs-A6s,A5s:0.5,A4s:0.5,A3s:0.75,A2s,KQs:0.75,KJs-K6s,K5s:0.75,K4s:0.5,K3s:0.5,K2s:0.5,QJs-Q8s,Q7s:0.5,Q6s:0.5,Q5s:0.25,JTs-J8s,J7s:0.75,T9s,T8s,T7s:0.75,98s,97s,96s:0.5,87s,86s,85s:0.5,76s:0.75,75s,65s:0.75,64s:0.75,54s:0.75,53s:0.5,AQo:0.5,AJo,ATo,A9o:0.75,A8o:0.5,KQo,KJo,KTo:0.75,QJo,QTo:0.5,JTo:0.5',
    note: 'You close the action with 1bb already in, so the price is good — but UTG’s range is strong. Defend suited hands broadly, offsuit only the better broadways; 3-bet a tight, mostly linear value range plus a few suited bluffs.',
  },
  'vsRFI/CO/HJ': {
    raise:
      'QQ+,JJ:0.75,TT:0.25,AKs,AQs:0.75,AJs:0.5,ATs:0.25,A5s,A4s:0.75,A3s:0.25,KQs:0.75,KJs:0.5,KTs:0.25,QJs:0.25,AKo,AQo:0.75,AJo:0.25,KQo:0.5,K9s:0.25,Q9s:0.25,J9s:0.25,T9s:0.25,65s:0.25,54s:0.25',
    call: 'JJ:0.25,TT:0.75,99-66,55:0.5,44:0.25,AQs:0.25,AJs:0.5,ATs:0.75,A9s:0.5,KQs:0.25,KJs:0.5,KTs:0.75,QJs:0.75,QTs:0.75,JTs:0.75,T9s:0.5,98s:0.5,87s:0.25,76s:0.25,AQo:0.25,AJo:0.25,KQo:0.25',
    note: 'The hijack opens wider, so the 3-bet grows: more value (AQ, KQs) and more suited bluffs. The button behind you is why the flatting range stays modest.',
  },
  'vsRFI/BTN/HJ': {
    raise:
      'QQ+,JJ:0.5,TT:0.25,AKs,AQs:0.75,AJs:0.5,ATs:0.25,A5s,A4s:0.75,A3s:0.5,A2s:0.25,KQs:0.5,KJs:0.5,KTs:0.25,QJs:0.25,AKo,AQo:0.75,AJo:0.25,KQo:0.5,K9s:0.25,Q9s:0.25,J9s:0.25,T8s:0.25,76s:0.25,65s:0.25,54s:0.25',
    call:
      'JJ:0.5,TT:0.75,99-55,44:0.75,33:0.5,22:0.5,AQs:0.25,AJs:0.5,ATs:0.75,A9s,A8s:0.5,A7s:0.25,KQs:0.5,KJs:0.5,KTs:0.75,K9s:0.5,QJs:0.75,QTs,Q9s:0.5,JTs,J9s:0.5,T9s,T8s:0.5,98s,97s:0.25,87s:0.75,76s:0.5,65s:0.5,AQo:0.25,AJo:0.5,ATo:0.25,KQo:0.5,KJo:0.25',
    note: 'On the button you can flat a wide, playable range and still 3-bet for value and with suited blockers. Calling keeps dominated hands like AJo and KQo out of 3-bet pots.',
  },
  'vsRFI/SB/HJ': {
    raise:
      'TT+,99:0.5,88:0.25,AKs,AQs,AJs,ATs:0.75,A9s:0.25,A5s,A4s:0.75,A3s:0.25,KQs,KJs:0.75,KTs:0.5,QJs:0.5,QTs:0.25,JTs:0.25,AKo,AQo:0.75,AJo:0.25,KQo:0.5,K9s:0.25,76s:0.25,65s:0.25',
    call: '99:0.25,88:0.25,77:0.25,ATs:0.25,KJs:0.25,KTs:0.25,QJs:0.25,JTs:0.5,T9s:0.25',
    note: 'From the small blind it is almost all 3-bet or fold: calling invites the big blind to squeeze and leaves you out of position in a multiway pot.',
  },
  'vsRFI/BB/HJ': {
    raise:
      'QQ+,JJ:0.75,TT:0.25,AKs,AQs:0.75,AJs:0.25,A5s:0.75,A4s:0.5,A3s:0.25,KQs:0.5,KJs:0.25,K9s:0.25,K5s:0.25,Q9s:0.25,J9s:0.25,T8s:0.25,76s:0.25,65s:0.25,54s:0.25,AKo,AQo:0.5,KQo:0.25',
    call:
      'JJ:0.25,TT:0.75,99-22,AQs:0.25,AJs:0.75,ATs-A6s,A5s:0.25,A4s:0.5,A3s:0.75,A2s,KQs:0.5,KJs:0.75,KTs-K6s,K9s:0.75,K5s:0.75,K4s:0.75,K3s:0.5,K2s:0.5,QJs-Q7s,Q9s:0.75,Q6s:0.75,Q5s:0.5,Q4s:0.25,JTs-J7s,J9s:0.75,J6s:0.25,T9s-T7s,T8s:0.75,T6s:0.25,98s-96s,87s-85s,76s:0.75,75s,74s:0.25,65s:0.75,64s,63s:0.25,54s:0.75,53s:0.5,43s:0.25,AQo:0.5,AJo-A9o,A8o:0.5,A7o:0.25,A5o:0.25,KQo:0.75,KJo,KTo,K9o:0.25,QJo,QTo:0.75,JTo:0.75,T9o:0.25',
    note: 'A third of hands defend. Suited hands carry the defence; offsuit hands need high cards to avoid being dominated. The 3-bet mixes value with suited wheel aces and connectors.',
  },
  'vsRFI/BTN/CO': {
    raise:
      'JJ+,TT:0.75,99:0.5,88:0.3,AKs,AQs,AJs:0.8,ATs:0.7,A9s:0.6,A8s:0.75,A7s:0.75,A6s:0.65,A5s,A4s,A3s:0.6,KQs:0.85,KJs:0.8,KTs:0.6,K9s:0.65,QJs:0.6,QTs:0.5,Q9s:0.9,JTs:0.4,J9s:0.8,T9s:0.65,T8s:0.3,98s:0.3,87s:0.3,76s:0.3,65s:0.3,AKo,AQo,AJo:0.75,ATo:0.35,KQo:0.85,KJo:0.45',
    call: 'TT:0.25,99:0.5,88:0.7,77-55,44:0.3,33:0.25,22:0.2,AJs:0.2,ATs:0.3,A9s:0.4,A8s:0.25,A7s:0.15,KQs:0.15,KJs:0.2,KTs:0.4,K9s:0.2,QJs:0.4,QTs:0.5,JTs:0.6,J9s:0.2,T9s:0.35,T8s:0.2,98s:0.3,AJo:0.25,KQo:0.15',
    note: 'The classic steal-vs-resteal spot. Against a wide cutoff open the button 3-bets a lot (~12%) — value, suited aces and suited kings/queens — and flats only a narrow range of pairs and suited broadways.',
  },
  'vsRFI/SB/CO': {
    raise:
      '99+,88:0.5,77:0.25,ATs+,A9s:0.5,A8s:0.25,A5s,A4s,A3s:0.5,A2s:0.25,KQs,KJs,KTs:0.75,K9s:0.5,QJs:0.75,QTs:0.5,Q9s:0.25,JTs:0.5,J9s:0.25,T9s:0.5,98s:0.25,87s:0.25,76s:0.25,65s:0.25,AKo,AQo,AJo:0.5,ATo:0.25,KQo:0.75,KJo:0.25',
    call: '88:0.25,77:0.25,66:0.25,KTs:0.25,QJs:0.25,QTs:0.25,JTs:0.5,T9s:0.25,98s:0.25',
    note: 'Against a cutoff open the small blind 3-bets about one hand in ten, almost never flatting: the big blind behind and your bad position punish calls.',
  },
  'vsRFI/BB/CO': {
    raise:
      'JJ+,TT:0.5,AKs,AQs,AJs:0.5,ATs:0.25,A5s,A4s:0.75,A3s:0.5,A2s:0.25,KQs:0.5,KJs:0.5,KTs:0.25,K9s:0.25,K5s:0.25,K4s:0.25,QJs:0.25,Q9s:0.25,J9s:0.25,T9s:0.25,T8s:0.25,97s:0.25,87s:0.25,86s:0.25,76s:0.25,65s:0.25,54s:0.25,AKo,AQo:0.75,AJo:0.25,KQo:0.5,KJo:0.25',
    call:
      'TT:0.5,99-22,AJs:0.5,ATs:0.75,A9s-A6s,A4s:0.25,A3s:0.5,A2s:0.75,KQs:0.5,KJs:0.5,KTs:0.75,K9s:0.75,K8s-K6s,K5s:0.75,K4s:0.75,K3s,K2s,QJs:0.75,QTs,Q9s:0.75,Q8s-Q4s,Q3s:0.5,Q2s:0.5,JTs,J9s:0.75,J8s-J6s,J5s:0.5,J4s:0.25,T9s:0.75,T8s:0.75,T7s,T6s,T5s:0.25,98s,97s:0.75,96s,95s:0.25,87s:0.75,86s:0.75,85s,84s:0.25,76s:0.75,75s,74s:0.5,65s:0.75,64s,63s:0.5,54s:0.75,53s,43s:0.5,AQo:0.25,AJo:0.75,ATo-A8o,A7o:0.5,A6o:0.25,A5o:0.5,A4o:0.25,KQo:0.5,KJo:0.75,KTo,K9o:0.75,K8o:0.25,QJo,QTo,Q9o:0.5,JTo,J9o:0.5,T9o:0.75,T8o:0.25,98o:0.25',
    note: 'Wider open, wider defence: about 40% of hands continue. Nearly every suited hand defends, and the offsuit range reaches down to A8o, K9o, Q9o, J9o and T9o.',
  },
  'vsRFI/SB/BTN': {
    raise:
      'TT+,99:0.75,88:0.75,77:0.5,66:0.25,A9s+,A8s:0.75,A7s:0.85,A6s:0.5,A5s,A4s,A3s:0.15,KTs+,K9s:0.9,K8s:0.5,K7s:0.25,QTs+,Q9s:0.9,JTs,J9s:0.9,T9s:0.75,T8s:0.5,98s:0.15,87s:0.15,76s:0.25,AJo+,ATo:0.75,KQo,KJo:0.75,KTo:0.25',
    call: '77:0.25,66:0.25,K9s:0.1,Q9s:0.1,J9s:0.1,T9s:0.25,98s:0.25,87s:0.25,76s:0.25',
    note: 'The button opens over 40%, so the small blind 3-bets a wide, fairly linear range to 11bb (~14%) and almost never flats — small pairs and weak suited hands simply fold.',
  },
  'vsRFI/BB/BTN': {
    raise:
      'TT+,99:0.75,88:0.25,AJs+,ATs:0.75,A9s:0.25,A5s:0.75,A4s:0.75,A3s:0.1,A2s:0.1,KQs,KJs:0.75,KTs:0.75,K9s:0.5,K8s:0.25,K7s:0.25,K6s:0.25,K5s:0.5,K4s:0.25,QTs:0.5,Q8s:0.25,JTs:0.75,J9s:0.5,J8s:0.25,T9s,T8s:0.6,98s:0.5,97s:0.25,87s:0.5,86s:0.25,76s:0.5,75s:0.25,65s:0.5,64s:0.25,54s:0.5,AKo,AQo,AJo:0.75,ATo:0.25,A9o:0.3,A7o:0.3,A5o:0.25,A4o:0.25,KQo:0.5,KJo:0.5,KTo:0.3,K9o:0.3,QJo:0.25,QTo:0.3',
    call:
      '99:0.25,88:0.75,77-22,ATs:0.25,A9s:0.75,A8s-A6s,A5s:0.25,A4s:0.25,A3s:0.9,A2s:0.9,KJs:0.25,KTs:0.25,K9s:0.5,K8s:0.75,K7s:0.75,K6s:0.75,K5s:0.5,K4s:0.75,K3s,K2s,QJs,QTs:0.5,Q9s,Q8s:0.75,Q7s-Q2s,JTs:0.25,J9s:0.5,J8s:0.75,J7s-J3s,J2s:0.5,T8s:0.4,T7s-T5s,T4s:0.4,T3s:0.4,98s:0.5,97s:0.75,96s,95s:0.4,87s:0.5,86s:0.75,85s,76s:0.5,75s:0.75,74s,65s:0.5,64s:0.75,63s,54s:0.5,53s,52s:0.5,43s,42s:0.5,32s:0.4,AJo:0.25,ATo:0.75,A9o:0.7,A8o,A7o:0.7,A6o:0.4,A5o:0.75,A4o:0.4,KQo:0.5,KJo:0.5,KTo:0.7,K9o:0.7,K8o:0.4,QJo:0.75,QTo:0.7,Q9o,JTo,J9o,T9o,T8o:0.4,98o:0.4,87o:0.4,76o:0.4',
    note: 'The widest defence in a raked game: a bit over 40% of hands. Almost every suited hand continues, but the weak offsuit hands (K7o, Q8o, 97o, 65o and the like) fold — with rake they can’t make up for being out of position. 3-bet ~13%: value, suited connectors and some offsuit broadways.',
  },
  'vsRFI/BB/SB': {
    raise:
      '88+,77:0.5,ATs+,A9s:0.5,A5s:0.75,A4s:0.75,A3s:0.5,A2s:0.5,KTs+,K9s:0.5,K8s:0.25,K7s:0.25,K6s:0.25,K5s:0.25,QTs+,Q9s:0.5,Q8s:0.25,JTs:0.75,J9s:0.5,J8s:0.25,T9s:0.5,T8s:0.25,98s:0.5,87s:0.5,76s:0.5,65s:0.5,54s:0.25,AJo+,ATo:0.75,A9o:0.5,A8o:0.25,A5o:0.25,KQo,KJo:0.75,KTo:0.5,QJo:0.5,QTo:0.25,JTo:0.25',
    call:
      '77:0.5,66-22,A9s:0.5,A8s-A6s,A5s:0.25,A4s:0.25,A3s:0.5,A2s:0.5,K9s:0.5,K8s:0.75,K7s:0.75,K6s:0.75,K5s:0.75,K4s-K2s,Q9s:0.5,Q8s:0.75,Q7s-Q2s,JTs:0.25,J9s:0.5,J8s:0.75,J7s-J4s,J3s:0.5,J2s:0.25,T9s:0.5,T8s:0.75,T7s-T5s,T4s:0.5,T3s:0.25,98s:0.5,97s,96s,95s:0.5,94s:0.25,87s:0.5,86s,85s,84s:0.5,76s:0.5,75s,74s,73s:0.25,65s:0.5,64s,63s:0.5,54s:0.75,53s,52s:0.25,43s:0.75,42s:0.25,ATo:0.25,A9o:0.5,A8o:0.75,A7o-A2o,A5o:0.75,KJo:0.25,KTo:0.5,K9o-K6o,K5o:0.75,K4o:0.75,K3o:0.5,K2o:0.25,QJo:0.5,QTo:0.75,Q9o,Q8o,Q7o:0.75,Q6o:0.5,Q5o:0.25,JTo:0.75,J9o,J8o,J7o:0.5,T9o,T8o,T7o:0.5,98o,97o:0.75,96o:0.25,87o,86o:0.5,76o:0.75,75o:0.25,65o:0.5,54o:0.25',
    note: 'You have position on the small blind for the whole hand. 3-bet to 9bb with a wide, linear range (~15%) and call most of the rest that has any playability.',
  },

  // ---------------------------------------------------------------- vs3B: the hero opened and faces a 3-bet (raise = 4-bet)

  'vs3B/UTG/HJ': {
    raise: 'KK+,QQ:0.5,AKs,AKo:0.5,A5s:0.5,A4s:0.25',
    call: 'QQ:0.5,JJ-99,88:0.75,77:0.5,66:0.25,AKo:0.5,AQs,AJs,ATs:0.75,A9s:0.25,KQs,KJs:0.75,KTs:0.25,QJs:0.5,JTs:0.5,T9s:0.25,AQo:0.75,AJo:0.25,KQo:0.25,A5s:0.25',
    note: 'An in-position 3-bettor and a strong opening range: continue with about 45%. 4-bet KK+ and AK (some QQ), with A5s / A4s as blocker bluffs; call the pairs and suited broadways out of position.',
  },
  'vs3B/UTG/CO': {
    raise: 'KK+,QQ:0.5,AKs,AKo:0.5,A5s:0.5,A4s:0.5',
    call: 'QQ:0.5,JJ-88,77:0.75,66:0.5,55:0.25,AKo:0.5,AQs,AJs,ATs:0.75,A9s:0.25,KQs,KJs:0.75,KTs:0.5,QJs:0.5,JTs:0.5,T9s:0.25,98s:0.25,AQo:0.75,AJo:0.25,KQo:0.25,A5s:0.25',
    note: 'Much like versus the hijack, a touch wider: the cutoff’s 3-bet holds more bluffs, so a few more pairs and suited connectors defend.',
  },
  'vs3B/UTG/BTN': {
    raise: 'KK+,QQ:0.5,AKs,AKo:0.5,A5s:0.5,A4s:0.5,A3s:0.25',
    call: 'QQ:0.5,JJ-77,66:0.5,55:0.25,AKo:0.5,AQs,AJs,ATs:0.75,A9s:0.25,KQs,KJs:0.75,KTs:0.5,QJs:0.75,JTs:0.5,T9s:0.5,98s:0.25,AQo:0.75,AJo:0.25,KQo:0.25,A5s:0.25',
    note: 'The button 3-bets wider than earlier seats, so defend a little more — but you are out of position, so calls favour hands that flop sets, strong pairs and nut draws.',
  },
  'vs3B/UTG/SB': {
    raise: 'KK+,QQ:0.5,AKs,AKo:0.5,A5s:0.5,A4s:0.25',
    call: 'QQ:0.5,JJ-77,66:0.5,55:0.25,AKo:0.5,AQs,AJs,ATs:0.75,KQs,KJs:0.75,KTs:0.25,QJs:0.75,QTs:0.25,JTs:0.5,T9s:0.25,AQo:0.75,AJo:0.25,KQo:0.25,A5s:0.25',
    note: 'Now you are in position against an 11bb 3-bet: calling is better than versus an in-position raiser, so more pairs, suited broadways and AQo continue.',
  },
  'vs3B/UTG/BB': {
    raise: 'KK+,QQ:0.5,AKs,AKo:0.5,A5s:0.5,A4s:0.25',
    call: 'QQ:0.5,JJ-77,66:0.5,55:0.25,AKo:0.5,AQs,AJs,ATs:0.75,KQs,KJs:0.75,KTs:0.25,QJs:0.75,QTs:0.25,JTs:0.5,T9s:0.25,AQo:0.75,AJo:0.25,KQo:0.25,A5s:0.25',
    note: 'In position against the big blind’s 3-bet. Its range is tight and value-heavy against UTG, so 4-bet only the top and flat the hands that realise equity well in position.',
  },
  'vs3B/HJ/CO': {
    raise: 'KK+,QQ:0.5,AKs,AKo:0.75,A5s:0.5,A4s:0.5,A3s:0.25',
    call: 'QQ:0.5,JJ-88,77:0.5,66:0.5,55:0.25,AKo:0.25,AQs,AJs,ATs,A9s:0.5,A8s:0.25,KQs,KJs:0.75,KTs:0.75,K9s:0.25,QJs,QTs:0.5,JTs:0.75,T9s:0.5,98s:0.25,87s:0.25,AQo:0.75,AJo:0.25,KQo:0.5',
    note: 'Out of position versus the seat right behind you. Continue a bit under half your opens: a 4-bet of KK+/AK with wheel-ace bluffs, and calls with pairs and suited broadways.',
  },
  'vs3B/HJ/BTN': {
    raise: 'KK+,QQ:0.5,AKs,AKo:0.75,A5s:0.5,A4s:0.5,A3s:0.25,K9s:0.25',
    call: 'QQ:0.5,JJ-77,66:0.75,55:0.5,AKo:0.25,AQs,AJs,ATs,A9s:0.25,KQs,KJs:0.75,KTs:0.5,QJs:0.75,QTs:0.5,JTs:0.75,T9s:0.5,98s:0.25,AQo:0.75,AJo:0.5,KQo:0.5,KJo:0.25',
    note: 'The button 3-bets the hijack often, so defend more — suited broadways and pairs call, the top of the range and some suited blockers 4-bet.',
  },
  'vs3B/HJ/SB': {
    raise: 'KK+,QQ:0.5,AKs,AKo:0.75,A5s:0.5,A4s:0.25',
    call: 'QQ:0.5,JJ-66,55:0.5,44:0.25,AKo:0.25,AQs,AJs,ATs,A9s:0.25,KQs,KJs,KTs:0.5,QJs,QTs:0.5,JTs:0.75,T9s:0.5,98s:0.25,AQo,AJo:0.25,KQo:0.5',
    note: 'In position against a blind 3-bet: call a healthy range (pairs, suited broadways, AQo/KQo) and keep 4-bets mostly for value plus a few A5s-type bluffs.',
  },
  'vs3B/HJ/BB': {
    raise: 'KK+,QQ:0.5,AKs,AKo:0.75,A5s:0.5,A4s:0.25',
    call: 'QQ:0.5,JJ-66,55:0.5,44:0.25,AKo:0.25,AQs,AJs,ATs,A9s:0.25,KQs,KJs,KTs:0.5,QJs,QTs:0.5,JTs:0.75,T9s:0.5,98s:0.25,AQo,AJo:0.25,KQo:0.5',
    note: 'Same idea as versus the small blind: position lets you flat more and 4-bet less, since the big blind’s 3-bet is fairly strong.',
  },
  'vs3B/CO/BTN': {
    raise: 'QQ+,JJ:0.75,TT:0.6,99:0.25,88:0.15,77:0.1,AKs,AKo,AQs:0.25,A5s:0.5,A4s:0.5,A3s:0.25,K9s:0.25,KTs:0.25',
    call: 'JJ:0.25,TT:0.4,99:0.75,88:0.85,77:0.9,66,55:0.75,44:0.5,33:0.25,AQs:0.75,AJs,ATs,A9s,A8s:0.5,A7s:0.25,KQs,KJs,KTs:0.75,K9s:0.75,QJs,QTs,Q9s:0.5,JTs,J9s:0.75,T9s,T8s:0.5,98s,87s:0.75,76s:0.5,65s:0.5,AQo,AJo,ATo:0.5,KQo,KJo:0.25',
    note: 'The button’s 3-bet against the cutoff is wide and bluff-heavy. Out of position, 4-bet more of your pairs (JJ and TT often, sometimes lower) instead of flatting them, along with AK and wheel-ace blockers; call suited broadways and connectors.',
  },
  'vs3B/CO/SB': {
    raise: 'QQ+,JJ:0.25,AKs,AKo,AQs:0.25,A5s:0.5,A4s:0.5,A3s:0.25',
    call: 'JJ:0.75,TT-55,44:0.5,33:0.25,AQs:0.75,AJs,ATs,A9s:0.5,A8s:0.25,KQs,KJs,KTs,K9s:0.25,QJs,QTs,Q9s:0.25,JTs,J9s:0.25,T9s:0.75,98s:0.75,87s:0.5,76s:0.25,AQo,AJo:0.75,ATo:0.5,KQo:0.75,KJo:0.5',
    note: 'In position against a wide small-blind 3-bet: flat liberally with pairs, suited broadways and connectors, and 4-bet for value with QQ+ and AK.',
  },
  'vs3B/CO/BB': {
    raise: 'QQ+,JJ:0.25,AKs,AKo,AQs:0.25,A5s:0.5,A4s:0.5,A3s:0.25',
    call: 'JJ:0.75,TT-55,44:0.5,33:0.25,AQs:0.75,AJs,ATs,A9s:0.5,A8s:0.25,KQs,KJs,KTs,K9s:0.25,QJs,QTs,Q9s:0.25,JTs,J9s:0.25,T9s:0.75,98s:0.75,87s:0.5,76s:0.25,AQo,AJo:0.75,ATo:0.5,KQo:0.75,KJo:0.5',
    note: 'Position versus the big blind makes calling attractive. Defend roughly half your opening range, mostly by flatting.',
  },
  'vs3B/BTN/SB': {
    raise: 'KK-QQ,AA:0.55,JJ:0.4,AKs,AKo,AQs:0.15,AQo:0.25,A5s:0.15,A4s:0.5,A3s:0.25,K9s:0.25,Q9s:0.45,J9s:0.25',
    call: 'AA:0.45,JJ:0.6,TT-66,55:0.45,44:0.15,33:0.15,AQs:0.85,AJs,ATs,A9s,A8s:0.75,A7s:0.5,A5s:0.85,A4s:0.5,A3s:0.5,KQs,KJs,KTs,K9s:0.75,K8s:0.25,QJs,QTs,Q9s:0.55,JTs,J9s:0.5,T9s,T8s,98s,87s,76s,54s:0.25,AQo:0.75,AJo,KQo,KJo:0.25',
    note: 'Against the small blind’s wide 3-bet you have position: flat pairs, suited aces and broadways and the best connectors, fold the weak offsuit hands and small pairs, and 4-bet KK/QQ, AK plus suited blockers (slowplaying some AA).',
  },
  'vs3B/BTN/BB': {
    raise: 'KK-QQ,AA:0.55,JJ:0.4,AKs,AKo,AQs:0.15,AQo:0.25,A5s:0.15,A4s:0.5,A3s:0.25,K9s:0.25,Q9s:0.45,J9s:0.25',
    call: 'AA:0.45,JJ:0.6,TT-66,55:0.45,44:0.15,33:0.15,AQs:0.85,AJs,ATs,A9s,A8s:0.75,A7s:0.5,A5s:0.85,A4s:0.5,A3s:0.5,KQs,KJs,KTs,K9s:0.75,K8s:0.25,QJs,QTs,Q9s:0.55,JTs,J9s:0.5,T9s,T8s,98s,87s,76s,54s:0.25,AQo:0.75,AJo,KQo,KJo:0.25',
    note: 'With position against the big blind’s 3-bet, continue with a bit under half your opens: pairs, suited aces and broadways, the best connectors, AJo+ and KQo. Weak offsuit broadways and small pairs fold. Slowplay some AA; 4-bet KK/QQ, AK and suited blockers.',
  },
  'vs3B/SB/BB': {
    raise: 'JJ+,TT:0.5,AQs+,AKo,AQo:0.5,AJs:0.25,A5s:0.75,A4s:0.5,A3s:0.25,KQs:0.25,K9s:0.25,K8s:0.25,Q9s:0.25,J9s:0.25,T8s:0.25',
    call: 'TT:0.5,99-33,22:0.75,AJs:0.75,ATs,A9s,A8s:0.75,A7s:0.5,A6s:0.5,A5s:0.25,A4s:0.5,A3s:0.5,A2s:0.5,KQs:0.75,KJs,KTs,K9s:0.5,K8s:0.5,K7s:0.25,QJs,QTs,Q9s:0.5,Q8s:0.25,JTs,J9s:0.5,J8s:0.25,T9s,T8s:0.75,97s:0.25,98s:0.75,87s:0.75,76s:0.75,65s:0.5,54s:0.25,AQo:0.5,AJo:0.75,ATo:0.25,KQo,KJo:0.5,KTo:0.25,QJo:0.5',
    note: 'Blind versus blind the big blind 3-bets small (9bb) and wide. You are out of position, so 4-bet more often for value and fold the weakest parts of your wide open.',
  },

  // ---------------------------------------------------------------- vs4B: the hero 3-bet and faces a 4-bet (allin = 5-bet jam)

  'vs4B/HJ/UTG': {
    allin: 'KK+,AKs:0.5,QQ:0.25',
    call: 'QQ:0.75,JJ:0.5,AKs:0.5,AKo:0.75,AQs:0.25',
    note: 'UTG’s 4-bet is very strong. Jam AA/KK, call QQ and AK in position, and give up the bluffs.',
  },
  'vs4B/CO/UTG': {
    allin: 'KK+,AKs:0.5,QQ:0.25',
    call: 'QQ:0.75,JJ:0.5,AKs:0.5,AKo:0.75,AQs:0.25',
    note: 'Same as the hijack: against a UTG 4-bet only the top of your 3-bet range continues; calling in position with QQ/AK keeps their bluffs in.',
  },
  'vs4B/BTN/UTG': {
    allin: 'KK+,AKs:0.5,QQ:0.25',
    call: 'QQ:0.75,JJ:0.5,AKs:0.5,AKo:0.75,AQs:0.25',
    note: 'The button’s 3-bet was tight and polar against UTG; the bluffs fold to the 4-bet and the premiums stack off or call in position.',
  },
  'vs4B/SB/UTG': {
    allin: 'KK+,QQ:0.5,AKs,AKo:0.5',
    call: 'QQ:0.5,JJ:0.25,AKo:0.25',
    note: 'Out of position, calling a 4-bet is unattractive: jam the top of the range (KK+, AK, half of QQ) and fold most of the rest.',
  },
  'vs4B/BB/UTG': {
    allin: 'KK+,QQ:0.5,AKs,AKo:0.5',
    call: 'QQ:0.5,JJ:0.25,AKo:0.25',
    note: 'Out of position against UTG’s tight 4-bet. Jam or fold, with a small call from QQ, JJ and AKo.',
  },
  'vs4B/CO/HJ': {
    allin: 'KK+,AKs:0.5,QQ:0.5,AKo:0.25',
    call: 'QQ:0.5,JJ:0.75,TT:0.25,AKs:0.5,AKo:0.5,AQs:0.5',
    note: 'In position against the hijack’s 4-bet: jam AA/KK and some QQ/AK, call JJ+ and AQs, fold the rest.',
  },
  'vs4B/BTN/HJ': {
    allin: 'KK+,AKs:0.5,QQ:0.5,AKo:0.25,A5s:0.25',
    call: 'QQ:0.5,JJ:0.75,TT:0.25,AKs:0.5,AKo:0.5,AQs:0.5',
    note: 'With position you can call QQ–JJ, AK and AQs; a few A5s jam as a bluff that blocks aces.',
  },
  'vs4B/SB/HJ': {
    allin: 'QQ+,AKs,AKo:0.75,JJ:0.25',
    call: 'JJ:0.5,AKo:0.25,AQs:0.25',
    note: 'From the small blind: jam QQ+ and AK, a little JJ; call sparingly — you would play the rest of the hand out of position.',
  },
  'vs4B/BB/HJ': {
    allin: 'QQ+,AKs,AKo:0.75,JJ:0.25',
    call: 'JJ:0.5,AKo:0.25,AQs:0.25',
    note: 'The big blind is out of position too: jam the value, call little, fold the bluffs.',
  },
  'vs4B/BTN/CO': {
    allin: 'QQ+,AKs,AKo:0.5,JJ:0.25,A5s:0.25,A4s:0.25',
    call: 'JJ:0.75,TT:0.5,AKo:0.5,AQs:0.75,AJs:0.25,KQs:0.25',
    note: 'The cutoff 4-bets the button wider. Stack off with QQ+ and AK, call JJ–TT and AQs in position, and jam a few wheel aces as bluffs.',
  },
  'vs4B/SB/CO': {
    allin: 'QQ+,AKs,AKo,JJ:0.5,TT:0.25,A5s:0.25',
    call: 'JJ:0.5,TT:0.5,99:0.25,AQs:0.5,AQo:0.25,AJs:0.25',
    note: 'Out of position against a cutoff 4-bet: jam QQ+, AK and half of JJ, call a little with TT and AQs.',
  },
  'vs4B/BB/CO': {
    allin: 'QQ+,AKs,AKo,JJ:0.5,A5s:0.25',
    call: 'JJ:0.5,TT:0.5,AQs:0.5',
    note: 'The big blind 3-bets the cutoff wide, so the 4-bet response is mostly jam-or-fold from out of position.',
  },
  'vs4B/SB/BTN': {
    allin: 'JJ+,AKs,AKo,AQs:0.5,TT:0.5,AQo:0.25,A5s:0.5,A4s:0.25',
    call: 'TT:0.5,99:0.5,88:0.25,AQs:0.5,AQo:0.5,AJs:0.5,ATs:0.25,KQs:0.5,KJs:0.25',
    note: 'The button 4-bets a wide range against small-blind 3-bets, so jam JJ+, AK and some AQs/TT — the wheel aces make good bluff-jams.',
  },
  'vs4B/BB/BTN': {
    allin: 'JJ+,AKs,AKo,AQs:0.5,TT:0.25,A5s:0.5,A4s:0.25',
    call: 'TT:0.5,99:0.25,AQs:0.5,AQo:0.25,AJs:0.25,KQs:0.25',
    note: 'Against the button’s wide 4-bet: jam a good chunk of your value (JJ+, AK, some AQs), call a few strong-but-not-premium hands, and fold the bluffs.',
  },
  'vs4B/BB/SB': {
    allin: 'QQ+,AKs,AKo:0.75,JJ:0.25,A5s:0.25,A4s:0.25',
    call: 'JJ:0.75,TT,99:0.75,88:0.5,77:0.25,AKo:0.25,AQs,AQo:0.5,AJs:0.75,ATs:0.5,KQs:0.75,KJs:0.5,QJs:0.25,AJo:0.25,KQo:0.25,A5s:0.25',
    note: 'You have position on the small blind, so call its 4-bet more than anywhere else — TT–JJ, AQ, KQs — and jam QQ+ and most AK.',
  },
};
