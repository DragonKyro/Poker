# Poker Trainer

GTO no-limit hold’em training in the browser, built for phone and desktop: preflop ranges for 6-max and 9-max, and flop play against strategies from the app’s own CFR solver, grouped by board texture.

**Play:** https://dragonkyro.github.io/Poker/ (add it to your home screen: the preflop side works fully offline, and so does every flop once you have drilled it).

## Features

- **Preflop drill.** A hand is dealt, the action plays out around a 6- or 9-handed table, and you act: open, fold, call, 3-bet, 4-bet or jam. You choose the situations (open raise, facing an open, facing a 3-bet, facing a 4-bet) and your seats. The answer shows how often GTO takes each action with your hand, and the full range is shown in the 13 × 13 grid.
- **Flop drill.** The preflop action plays out (single-raised and 3-bet pots), the flop is dealt, and the line to your decision is played. Then you decide: c-bet 33% or 75% or check, fold / call / raise against a c-bet, play against a check-raise. Every answer comes with the solver’s mix for your exact combo, the EV of each option and the EV you gave up. You can drill one kind of board at a time.
- **Grading for mixed strategies.** An action is *correct* if GTO takes it often (≥ 35% or most often). *Good* means part of the mix; *inaccuracy* is a rare mix or a small EV loss. *Mistake* and *blunder* mean GTO never plays it, near or far from the range’s edge. Optional **RNG mode** rolls 1–100 before each decision, like GTO Wizard’s randomiser, and grades mixed hands by the roll.
- **Smart dealing.** By default most hands come from the edges of the range and the hands the solver mixes with, not trivial folds. You can switch to *all hands* (the true distribution), *edges only*, or *my mistakes*. That last one is a review queue of hands you got wrong; they come back until you get them right.
- **Range charts.** Every preflop chart, with per-cell frequencies, the share of hands reaching the spot, and a note on what the spot teaches.
- **Board lab.** For each pot, how a decision changes from texture to texture: every solved flop as a strategy bar, grouped into families (ace-high, broadway, K/Q-high, connected, middling, low & dry, paired, monotone) with each family’s average. Any flop opens up into its full strategy: by hand class, by hand type (overpairs, top pair, draws, air…), and combo by combo with EVs.
- **Progress.** Accuracy by situation, seat, pot, decision and texture, plus EV lost per flop decision, your weakest spots, a day streak and the last two weeks. Progress is saved on the device; sign in with Google to keep phone and computer in step. Devices merge without overwriting each other.
- **The table.** Cards and chips drawn in code (four-colour or red/black deck). Cards are dealt from the middle, bets slide out from the seats, folds go to the muck, and bets are swept into the pot when the flop comes. The board flips over, and whoever is to act gets a pulsing ring. Keyboard shortcuts (F / C / X / R / B / A, 1–9, Space for the next hand), synthesized sounds, three table paces, reduced-motion support.

## Where the strategies come from

- **Preflop:** hand-written charts that approximate modern solver output for 100bb cash with no ante and moderate rake (NL200–NL500-like). The key spots — opening ranges, big-blind and small-blind defence, button 3-bets, facing a 3-bet — were checked against GTO Wizard's published numbers and corrected; see [docs/validation.md](docs/validation.md). Opens are 2.5bb (SB 3bb, raise-or-fold). 3-bets are 7.5bb in position, 11bb from the blinds and 9bb for BB vs SB. 4-bets are 20 / 22 / 24bb, and 5-bets are all-in. They are not solver-exact. The format is standard range text (`"QQ+,AKs,A5s:0.5"`, the notation PioSolver / GTO+ / GTO Wizard export), so exact charts can be pasted in. 9-max spots that only involve LJ and later seats reuse the 6-max chart, with LJ in UTG’s place.
- **Flop:** solved by this app’s solver (`src/solver/`): Discounted CFR over the full flop → turn → river tree, with exact card removal. Each spot’s ranges are taken from the preflop charts, so the two halves agree. The bet sizes are simplified:

  | Street | Bets | Raises |
  |---|---|---|
  | Flop | 33% / 75% for the raiser, a 50% stab when checked to | ≈ 3× (60% pot), then all-in |
  | Turn | 66% | all-in |
  | River | 75% | none |

  The batch covers 5 pots × 36 representative flops. Every flop is solved to within 0.8% of the pot in exploitability (median 0.56%), and each flop’s value is shown in the board lab. The results were checked against GTO Wizard’s published flop numbers in [docs/validation.md](docs/validation.md).

  | Pot | Type |
  |---|---|
  | BTN vs BB | single-raised |
  | CO vs BB | single-raised |
  | UTG vs BB | single-raised |
  | SB vs BB | single-raised |
  | BB vs BTN | 3-bet pot |

## Development

```bash
npm install
npm run dev          # http://localhost:5173/Poker/
npm run test:run     # unit tests: evaluator, ranges, charts, solver convergence (~1 min)
npm run build        # type-check, build, service worker → dist/
npm run solve        # solve every missing (pot, flop) → src/data/postflop/ (hours; resumable)
npm run report       # docs/solver-report.md: c-bet / defence frequencies per flop and texture
node scripts/make-icons.mjs   # redraw the favicon and app icons
```

Stack: TypeScript, React 19, Zustand, Vite, Vitest, Firebase Auth + Firestore (lazy-loaded), `vite-plugin-pwa`.

Layout: `src/poker` (cards, hand classes, ranges, evaluator, textures, made hands) · `src/preflop` (charts, spots, dealing) · `src/solver` (game tree, DCFR) · `src/postflop` (pots, flops, loading and reading solutions, dealing) · `src/train` (grading) · `src/data/postflop` (generated solutions) · `src/store` (progress, prefs) · `src/net` (sign-in and sync) · `src/ui` (pages, table, grids, card art, styles). See `CLAUDE.md` for the details.

`npm run solve -- --spots srp-btn-bb --flops As7d2c,Ks7d2c --iters 150 --workers 8 --force` solves a subset. The batch runs worker threads at below-normal priority, sizes the pool to free memory, and writes each flop as it finishes, so you can stop it and run it again later.

## Deploying

Pushing to `main` runs `.github/workflows/deploy.yml` (tests, build, GitHub Pages). One-time setup:

1. GitHub repo → Settings → Pages → Source: **GitHub Actions**.
2. Firebase console (project `github-games-e7c7d`) → Authentication → Sign-in method → **Google** enabled; Authentication → Settings → Authorized domains → `dragonkyro.github.io`.
3. Firestore rules: `npm run deploy:rules`. The project is shared: `firestore.rules` holds every app’s rules, Bridge Master’s included, so keep it in step with `../Bridge-Master/firestore.rules`.

## Roadmap

- Turn and river: the solver already handles 4- and 5-card boards. Next is solving turn and river spots on demand in a Web Worker (they take seconds), continuing from the flop drill’s line.
- 9-max postflop pots, more 3-bet pots, and more flops per family.
- Solver-exact preflop charts, if you have them to import.
