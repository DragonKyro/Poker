# CLAUDE.md

Context for Claude working in this repo.

## What this is

A GTO no-limit hold'em trainer, a static web app for GitHub Pages (`https://dragonkyro.github.io/Poker/`, repo `DragonKyro/Poker`), built for phone and desktop. Preflop drills and charts for 6-max and 9-max (100bb cash), flop drills against solutions from our own CFR solver, a board-texture "lab", and progress stats synced through Firestore. Works offline (PWA). Structure and conventions follow `../Bridge-Master` (same stack, same shared Firebase project).

Cards and chips are drawn in code (`src/ui/cards/cardArt.ts`, adapted from Bridge Master's deck); there are no image assets besides the app icons.

## Tech stack

TypeScript, Vite 6, React 19, Zustand, Vitest. Firebase (Auth with Google + Firestore), lazy-loaded. `vite-plugin-pwa` (Workbox). Fonts self-hosted via @fontsource (Inter, Sora). No runtime dependencies beyond those; the solver is our own code.

## Commands

- `npm run dev` · `npm run build` (tsc + vite build + service worker) · `npm run preview`
- `npm run test:run` — all tests (~1 min; `src/solver/solver.test.ts` is the slow one).
- `npx tsc --noEmit -p .`
- `npm run solve [-- --spots a,b --flops X,Y --iters N --workers N --force]` — batch-solve flops into `src/data/postflop/<spot>/<flop>.json`. `scripts/solve.mjs` bundles `scripts/solve/{main,worker}.ts` with esbuild (ships with Vite) into `.solve/` and runs them with worker threads at below-normal priority. It skips files that exist, so it resumes. The pool is capped by free memory (≈0.5 GB per solve). Each solve runs 120 iterations, then 40 more at a time (up to 220) until it is under 0.8% pot (`--iters`, `--target`, `--max-iters`). Paired boards with the raiser out of position converge slowest: SB vs BB on KK7 needed 460 iterations, and was re-run with `--spots srp-sb-bb --flops KsKd7c --iters 300 --max-iters 700 --target 0.006 --force`. All 180 current solutions are within 0.8% pot. The full batch (5 spots × 36 flops) takes several hours on this 10-core machine; BTN vs BB flops take ~28 min each with 10 running at once. The generated JSON is committed; CI never solves.
- `npm run report` — `docs/solver-report.md`: per pot, the raiser's c-bet mix and the caller's fold / call / raise against each size, per flop and per board family (weighted by `flopWeight`). Use it to compare the solver with published GTO numbers after a (re-)solve.
- `npm run fix-lock` — **run after any `npm install` that changes package-lock.json.** This machine installs through a corporate Artifactory mirror (`NPM_CONFIG_REGISTRY`), which writes mirror URLs into the lockfile that GitHub Actions can't reach. The lockfile must contain no `drwholdings` URLs.
- `npm run deploy:rules` — deploy `firestore.rules`. **Confirm with the user first** (shared project; see below).
- `node scripts/make-icons.mjs` — redraw `public/favicon.svg` and the PNG icons (a fanned K♥ A♠ over a chip on felt) with the local Chrome (`CHROME` to override).

## Architecture

Import directions: `ui → store → train/preflop/postflop → solver → poker`; `net` is used by store-level code and the UI only. Path alias `@/` → `src/`.

- **`src/poker/`** — pure poker. `cards.ts` (card = `rank * 4 + suit`, rank 0..12 = 2..A, suit 0..3 = c d h s; text `'As'`), `hands.ts` (1326 combos `comboIndex(a,b) = hi*(hi-1)/2 + lo`; 169 classes `'AKs'` in grid order, pairs on the diagonal, suited above), `range.ts` (range text ↔ class weights), `eval.ts` (7-card evaluator → comparable int), `positions.ts` (formats, seats, `inPosition`), `texture.ts` (flop families + facets, `flopWeight`), `madeHand.ts` ("Top pair, good kicker + flush draw", buckets).
- **`src/preflop/`** — `types.ts` (`ChartSource`, `PreflopSpot`), `charts/sixMax.ts` (all 50 6-max charts), `charts/nineMax.ts` (the 66 charts involving UTG / UTG+1 / UTG+2), `charts/keys.ts` (which charts each book must have), `spots.ts` (builds every spot: history, pot, sizes, strategy, `reach`; 9-max spots without an early seat map onto 6-max with LJ→UTG), `drill.ts` (dealing: spot from the set-up, class weighted by reach × combos, "edge" classes favoured).
- **`src/solver/`** — `tree.ts` (betting-tree *template*: one copy per street, chance nodes have a single child; `StreetConfig` sizes as pot fractions; raise = `theirBet + f × (pot + toCall)`; `allinThreshold`), `solver.ts` (vectorised DCFR α 1.5 β 0 γ 2, alternating updates; per-node typed arrays indexed by runout instance; exact card removal; precomputed strengths per runout and a pairwise equity matrix for flop all-ins; `compressRiver` stores river regrets as Int16 with a per-block scale; `avgStreets` keeps averages only on early streets; `exploitability()`, `evaluateAll()` → per-action EVs at first-street nodes).
- **`src/postflop/`** — `spots.ts` (the 5 pots: ranges from the preflop charts, tree configs; `nodeKind` names decisions cbet / vsCbet / vsRaise / stab / vsStab), `flops.ts` (the 36 hand-picked flops, ≥3 per family), `types.ts` (stored JSON format: base64 Uint8 freqs ×255, Int16 EVs in 0.01 bb, Uint8 reach), `decode.ts` (JSON → typed arrays; Node-safe), `load.ts` (lazy `import.meta.glob` per flop), `view.ts` (node totals, path frequency, class grid, hand-type rows, combos, `evFromHere` — stored EVs count from the flop's start, the UI shows them from the decision on so folding is 0), `drill.ts` (dealing: spot → flop by family → kind → node by line frequency → combo by reach, mixed hands favoured).
- **`src/train/grade.ts`** — verdicts best / good / inaccuracy / mistake / blunder from frequency (preflop) and EV loss in % pot (postflop); RNG roll picks the "target" action from the most aggressive down.
- **`src/store/`** — `progressStore` (per-device record `{ spots, days, misses, at }`; totals = sum over devices; misses `+ms`/`−ms` newest-wins), `prefsStore` (deck, sound, pace, RNG, auto-advance, drill set-ups).
- **`src/net/`** — `firebaseConfig.ts` (the "Poker" web app in `github-games-e7c7d`, collection `pokerTrainer`, localStorage prefix `pokerTrainer.`), `cloud.ts` (lazy Firebase, Google popup sign-in, pull + absorb on sign-in / reconnect, debounced push of this device's entry with `setDoc(..., { mergeFields: ['devices.<id>', 'updated'] })`).
- **`src/ui/`** — `App.tsx` + `router.ts` (hash routes `#/`, `#/preflop`, `#/postflop`, `#/charts/6max/vsRFI/BB/BTN`, `#/boards/<spot>/<flop>`, `#/stats`). `table/` has `PokerTable` (seats on an ellipse in % of a `container-type: size` box; animations use `cqw/cqh` offsets), `script.ts` (a hand as events → `tableAt(scene, k)`), `useScript` (plays events at the pace), and `Controls` (action bar, feedback). `grid/` has `RangeGrid` + `StrategyBar`, `PreflopRange`, `PostflopRange`, action `colors` and `labels`. `pages/` has Home, PreflopPage, PostflopPage, ChartsPage, BoardsPage, StatsPage, `session.tsx`, and `demo.ts` (dev-only `?demo` auto-answer for headless screenshots). Also `cards/` (cardArt, CardView, FlipCard), `shared/` (Icon, Settings + Account + TopBar + SyncDot, text helpers), `sounds.ts` and `styles/` (theme, table, grid, pages).

## Invariants and gotchas

- `docs/validation.md` records which charts were checked against GTO Wizard's published numbers (and the flop benchmarks); keep its "after" column in step when a checked chart changes. The chart totals are calibrated to raked (NL500-like) solutions — e.g. BB defends ~44% vs a BTN open, not the ~60% of an unraked game.
- Chart semantics: in a `ChartSource`, fold is the remainder; per class the weights sum to ≤ 1 (tested). **vs3B frequencies are conditional on having opened, vs4B on having 3-bet** — `PreflopSpot.reach` carries the prior, drills deal by it, the grid fills cells to it. AA/KK never fold (tested).
- Solver values are pot shares: folding is 0 from the tree's start, the two ranges' EVs sum to the starting pot (tested). Chance nodes divide by (cards left − 4) — every compatible pair of hands sees exactly that many cards. Don't change the terminal maths without the brute-force test in `solver.test.ts`.
- Changing a spot's tree, ranges or the solver invalidates `src/data/postflop/<spot>/` — re-solve with `--force` for that spot.
- The 9-max ↔ 6-max mapping (LJ ≈ 6-max UTG) is deliberate: same number of players behind.
- One colour per action everywhere (`--a-fold` blue, `--a-call` green, bets amber → red by size, `--a-allin` magenta). Every animation has a reduced-motion fallback (`theme.css` bottom).
- The PWA precaches the shell and charts; solved flops are built into `assets/flops/` (vite.config.ts `chunkFileNames`) and runtime-cached (CacheFirst) as they're used, so the first visit stays ~2 MB.
- Headless screenshots: Chrome on Windows has a ~500 px minimum window width; emulate a phone with `--force-device-scale-factor=1.5 --window-size=585,1266` (a 390 px CSS viewport), not a small window.

## Firebase (shared project)

Project `github-games-e7c7d` is shared with Bridge Master, tractor, catan and others. This app uses Firestore `(default)` and Auth:

- Document `pokerTrainer/{uid}` = `{ devices: { "<deviceId>": { spots, days, misses, at } }, updated }`. Each device writes only its own entry.
- `firestore.rules` is the **whole project's** Firestore rule set (deploying replaces every rule). It contains Bridge Master's `bridgeMaster/{uid}` block plus ours. Keep it identical to `../Bridge-Master/firestore.rules` when either changes.
- Google sign-in must be enabled and `dragonkyro.github.io` an authorized domain (already the case for Bridge Master).

## Conventions

- State is plain JSON; stores persist to localStorage under `pokerTrainer.*`.
- Don't commit or push unless asked; pushing `main` deploys.
