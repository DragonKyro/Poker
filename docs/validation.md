# Validation against published GTO data

This compares the app's strategies with published solver output. The only reference source reachable for this check (2026-11-23) was the **GTO Wizard blog** (6-max cash, 100bb), so every reference number below comes from one vendor's solver, at several rake levels. "Sources agree" means GTO Wizard's NL50 and NL500 solutions, or two of its articles, agree. GTO Wizard's sizes differ a little from ours: its NL500 "General" tree opens 2–2.5bb and 3-bets 12–13bb from the blinds, against our 2.5bb opens and 11bb blind 3-bets. Where it matters, the closest comparable solution (NL200, 2.5x opens) is used.

## Preflop (6-max)

Share of all hands, per action. **Before** is the first draft of the charts; **after** is the current `src/preflop/charts/sixMax.ts`.

| Spot | Before | After | GTO Wizard | Source |
|---|---|---|---|---|
| UTG open | 17.7% | 17.4% | 17.7% (NL200, 2.5x) | [A] |
| CO open | 28.0% | 28.8% | 28.8% (NL200, 2.5x) | [A] |
| BTN open | 43.7% | 43.7% | 43.6% (NL500), 42% (NL50) | [B], [C] |
| BB vs BTN: call / 3-bet | 47.1 / 12.6 | **30.6 / 13.7** | 30.0 / 13.8 (NL500); ~26 / ~14 (NL50) | [F], [C] |
| BB vs SB: call / 3-bet | 42.9 / 16.3 | 42.9 / 16.3 | 41.2 / 16.1 (NL500) | [B] |
| SB vs BTN: 3-bet / call | 16.2 / 1.3 | 14.7 / 0.6 | 14.2 / 2 | [F] |
| SB vs CO / HJ / UTG 3-bet | 10.8 / 7.9 / 5.5 | unchanged | 10.9 / 7.4 / 6.1 | [F] |
| BTN vs CO: call / 3-bet | 9.7 / 9.1 | **4.2 / 11.7** | 5.1 / 11.8 (vs 2.3x) | [H] |
| BTN vs UTG: call / 3-bet | 8.0 / 4.6 | 7.4 / 6.5 | 8.2 / 7.5 (vs a 2bb open) | [H] |
| CO vs UTG: call / 3-bet | 4.0 / 5.1 | 2.6 / 7.1 | 1.4–3.2 / 8–9 (NL50) | [G] |
| BTN vs BB 3-bet: fold / call / 4-bet (% of opens) | 52 / 39 / 9 | **65 / 27 / 8** | 63 / 26 / 8 + 3 jam (NL500, vs 13bb) | [B] |
| CO vs BTN 3-bet: 4-bet pairs | QQ+, JJ ¼ | QQ+, JJ ¾, TT 60%, 99–77 some | "usually TT–QQ, occasionally 77" | [J] |

The first draft's biggest misses are now fixed:
- **BB vs BTN defence** was about 60% of hands, the width of an unraked game. With rake, the solver folds the weak offsuit hands, so BB now defends about 44%.
- **BTN facing a blind 3-bet** called too much.
- **The button** flatted too much against CO and UTG opens instead of 3-betting.

The UTG and CO opening ranges kept their size but changed shape. Small pairs and gapped suited connectors were cut; offsuit aces and broadways were added.

Not verified (no reachable source): HJ open, SB raise-or-fold opens (GTO Wizard's SB mixes limps at 100bb), BB vs HJ / CO / UTG calling ranges, the other vs-3-bet and all vs-4-bet charts, and every 9-max chart. Those remain hand-written approximations.

## Flop (to compare with `docs/solver-report.md`)

GTO Wizard, BTN vs BB single-raised pot, 100bb, NL500 [O]. Its "simple" tree has no BB donk bets and uses 33 / 66 / 130% bets, where ours uses 33 / 75%.

| | GTO Wizard |
|---|---|
| BTN c-bet, all flops | 53% (33%: 31, 66%: 14, 130%: 8) |
| … A-high / K-high / Q-high flops | 48 / 60 / 58% |
| … rainbow / two-tone / monotone | 60 / 50 / 37% (monotone almost all 33%) |
| … disconnected / connected | 57 / 49% |
| BB vs a 33% c-bet (rainbow): fold / call / raise | 34 / 52 / 15 |
| BB vs a 33% c-bet (monotone) | 35 / 59 / 6 |
| A73r [O][P] | bets 50% (mostly 33%); BB vs 33%: 36 / 54 / 10 |
| QQ6r [P] | bets 82% (75% of hands at 33%); BB vs 33%: 37 / 39 / 24 |
| KJ7 two-tone [P] | bets 47%, mostly big (125% / 75%) |

Other pots (fewer data points):
- **UTG vs BB:** UTG c-bets a lot, e.g. KT6r 79%, Q93r 71%, AK9 two-tone 85% [R].
- **3-bet pots:** the OOP 3-bettor c-bets about two-thirds of flops, with small and medium sizes [N].

Sources:
- [A] https://blog.gtowizard.com/how_to_crush_ante_cash_games/
- [B] https://blog.gtowizard.com/preflop-range-morphology/
- [C] https://blog.gtowizard.com/poker-strategies-tournaments-vs-cash-games/
- [F] https://blog.gtowizard.com/crush-3-bet-pots-oop-in-cash-games/
- [G] https://blog.gtowizard.com/rake-rakeback-explained-optimize-your-poker-earnings/
- [H] https://blog.gtowizard.com/playing-calls-from-the-button-in-cash-games/
- [J] https://blog.gtowizard.com/oop-4-betting-in-deep-stacked-cash-games/
- [N] crush-3-bet-pots (images)
- [O] https://blog.gtowizard.com/flop-heuristics-ip-c-betting-in-cash-games/
- [P] https://blog.gtowizard.com/the-mechanics-of-c-bet-sizing/
- [R] https://blog.gtowizard.com/do-multiple-sizes-matter/

### Our solver vs GTO Wizard — BTN vs BB (all 36 flops solved with the corrected ranges)

| | Ours | GTO Wizard |
|---|---|---|
| BTN c-bet, all flops (weighted) | **53%** (33%: 32, 75%: 21) | **53%** (33%: 31, 66% + 130%: 22) |
| BB vs a 33% c-bet: fold / call / raise | 35 / 50 / 15 | 34 / 52 / 15 (rainbow), 33 / 54 / 14 (two-tone) |
| Monotone flops | 39% (33%: 29) | 37%, almost all 33% |
| Monotone, BB vs 33% | 36 / 57 / 7 | 35 / 59 / 6 |
| A-high flops | 42% | 48% |
| Connected flops | 39% | 49% |

The overall c-bet rate, the sizing split and BB's defence against the small bet match GTO Wizard closely. The draft charts' wider BB range gave 64%, which was the main error. A-high and connected boards come out 6–10 points more passive. That is plausibly from the simpler tree: one big size (75%) instead of 66% / 130%, and no overbet. Per-flop numbers are in `docs/solver-report.md`.

### Specific boards (closest published board)

| Pot · our board | Ours: bet % (33% share); BB vs 33% f/c/r | GTO Wizard board | GTO Wizard |
|---|---|---|---|
| BTN vs BB · A72r | 50 (43); 41 / 48 / 12 | A73r | 50 (35 at 33% + 13 at 50%); 36 / 54 / 10 |
| BTN vs BB · KK7r | 94 (90); 41 / 40 / 20 | QQ6r | 82 (75); 37 / 39 / 24 |
| BTN vs BB · 654r | 27 | 543r (BB may not lead) | ~20 |
| BTN vs BB · monotone (4 boards) | 32–45, mostly 33% | monotone average | 37, almost all 33% |
| UTG vs BB · AK5r | 87 | AK9 two-tone | 85 |
| UTG vs BB · KJTr | 93 | QJTr | 100 |
| UTG vs BB · Q83r | 80 | Q93r | 71 |
| UTG vs BB · T52r | 80 | T52 two-tone | 74 |
| UTG vs BB · 952 two-tone | 63 | 962 two-tone | 68 |
| UTG vs BB · K94 two-tone | 56 | K86 two-tone | 72 |
| BB vs BTN 3-bet pot · all flops | 61 | SB vs BTN 3-bet pot (proxy) | 66 |
| BB vs BTN 3-bet pot · K72r / KQ6r | 96 / 86 | KQ2r (proxy) | 100 |
| BB vs BTN 3-bet pot · 654r | 46 | 654r (proxy) | "checks heavily" |

Most boards land within about 10 points of the published solution, with the same sizing preference. The clear gaps:
- **K94 two-tone (UTG vs BB):** −16 points.
- **654r in the 3-bet pot:** we bet 46%; the proxy checks far more. The proxy is SB's 3-bet range, not BB's, so the comparison is loose.
- **A-high and connected boards (BTN vs BB):** 6–10 points more passive, as above.

All 180 solved flops (5 pots × 36) are within 0.8% of the pot in exploitability (median 0.56%). No published numbers were found for CO vs BB or SB vs BB postflop. Their solves use the same solver and tree; aggregates are in `docs/solver-report.md` (CO vs BB c-bets 56%, SB vs BB 53%).
