# Trade Plan Checker — Build Plan

A single-page, dark-mode trading dashboard that helps traders sanity-check a setup before entering. Everything runs client-side — no account, no backend.

## Layout

Single route at `/` (replaces the placeholder index). Two-column on desktop, stacked on mobile.

```text
 ┌─────────────────────────────────────────────────────┐
 │  Trade Plan Checker                          ◐ logo │
 │  Pre-trade risk & reward sanity check               │
 ├──────────────────────────┬──────────────────────────┤
 │  TRADE INPUTS (card)     │  RESULTS (sticky card)   │
 │                          │                          │
 │  Account balance  $      │  Grade:    A             │
 │  Risk %           %      │  $ Risk:   $250.00       │
 │  Direction   [Buy][Sell] │  $ Reward: $625.00       │
 │  Asset / pair            │  R:R       2.5 : 1       │
 │  Entry price             │                          │
 │  Stop loss               │  ▸ Coaching feedback     │
 │  Take profit             │  ▸ Warnings (if any)     │
 │                          │                          │
 │  [ Reset ]               │                          │
 ├──────────────────────────┴──────────────────────────┤
 │  Disclaimer: educational use only…                  │
 └─────────────────────────────────────────────────────┘
```

Results update live as the trader types — no submit button needed. A subtle empty state shows in the results card until enough fields are filled.

## Inputs

All in one card, grouped logically:

- **Account balance** — number input, $ prefix
- **Risk %** — number input, % suffix, default 1
- **Direction** — segmented Buy / Sell toggle (green / red accents)
- **Asset / pair** — free text (e.g. "EURUSD", "BTCUSD", "AAPL")
- **Entry price** — number
- **Stop loss** — number
- **Take profit** — number

Validation (client-side, zod):
- Balance > 0, risk between 0.01 and 100
- Entry, stop, TP all > 0
- For Buy: stop < entry < TP recommended (warn if violated)
- For Sell: TP < entry < stop recommended (warn if violated)

Invalid / empty fields just suppress the result rather than throwing errors.

## Calculations

- Dollar risk = balance × (risk% / 100)
- Stop distance = |entry − stop|
- Target distance = |TP − entry|
- R:R = target distance / stop distance
- Reward $ = dollar risk × R:R

## Grading & coaching

Grade is derived from R:R plus the risk-% warning:

| Condition | Grade | Tone |
|---|---|---|
| Risk > 2% | Warning (orange) | overrides grade badge color |
| R:R ≥ 3 | A | green |
| R:R 2 – 3 | B | green |
| R:R 1.5 – 2 | C | yellow |
| R:R < 1.5 | Warning | red |

Coaching messages (shown verbatim per spec):
- Risk > 2% → "Risk is aggressive. Consider reducing position size."
- R:R < 1.5 → "Reward profile is weak. This setup may not justify the risk."
- 1.5 ≤ R:R < 2 → "Acceptable setup. Confirm structure, timing, and market context."
- R:R ≥ 2 → "Strong reward profile. Still confirm market structure, DXY alignment, and news timing before entering."

Direction-vs-prices mismatch (e.g. Buy with TP below entry) shows a separate inline warning so the trader catches data-entry mistakes.

## Results card

- Big **Grade badge** at the top (color-coded)
- Three stat tiles: Dollar Risk, Estimated Reward, R:R ratio (formatted "2.5 : 1")
- Coaching feedback block with an icon (info / check / warning)
- Any active warnings listed below

## Visual style

- Dark mode only (force `.dark` on `<html>`)
- Background: deep slate; cards: slightly lighter slate with subtle border
- Accent: emerald green for buy / positive, rose red for sell / negative, amber for caution
- Typography: tight headings, monospaced numbers in the results so digits align
- Generous spacing, rounded-xl cards, soft shadows — premium dashboard feel
- Fully responsive: two-column ≥ lg breakpoint, single column below

## Footer

Small muted disclaimer:
> "This tool is for educational purposes only and does not provide financial advice."

## Technical notes

- TanStack Start, single route file `src/routes/index.tsx`
- All state via `useState`; results computed with `useMemo`
- shadcn `Card`, `Input`, `Label`, `Button`, `ToggleGroup`, `Badge` already available
- No backend, no DB, no auth — pure client calculation
- Update `__root.tsx` head meta (title "Trade Plan Checker", description, og tags) and add `className="dark"` to `<html>` in the root shell
