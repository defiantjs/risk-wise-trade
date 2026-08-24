# PipGrade — Polish & Publish Plan

Four focused work items, then publish a stable production build.

## 1. Fix position-sizing math bug (confirmed, highest priority)

The live `/validate` tool currently outputs **2,000.00 lots** for the canonical test case:

```text
Balance 10,000 · Risk 1% · Buy EURUSD · Entry 1.1000 · Stop 1.0950 · TP 1.1100
Expected size: 0.20 lots   →   App shows: 2,000.00 lots (sticky bar + results card)
```

Root cause: the size formula treats the forex pip value ($10) as $ per 1.0 price move instead of $ per pip (0.0001). It computes `100 / (0.005 × 10) = 2,000` instead of `100 / (50 pips × $10) = 0.20`. The % move / pips display already converts correctly, so only the size path needs the pip-size factor.

Fix:

- Add a pip-size constant per asset type (forex: 0.0001, 0.01 for JPY pairs; gold/indices/crypto/stocks: 0.01 point size per existing CFD settings).
- Apply it in the suggested-size calculation, the mini-bar size, the "How size was calculated" breakdown, and the exported trade card so all four stay consistent.
- Re-verify the three known cases: EURUSD → 0.20 lots; Gold ($10k, 2%, 2000/1980/2040) → 10 oz (0.10 lots); XAUUSD ($100k, 1%, 4052/4060/4035) → 1.25 lots.

## 2. Per-route SEO metadata

Only `__root.tsx` has head metadata today; `/`, `/validate`, `/growth`, `/scaling` have none, so every page shares the same title/description.

- Add a `head()` to each of the four routes with a unique title (<60 chars), meta description (<160 chars), og:title, og:description, og:type, twitter:card.
- Move the `og:image`/`twitter:image` off `__root` (root shouldn't carry it); keep it on the landing page leaf route.

## 3. Mobile QA pass (390px viewport, Playwright)

Verify and fix any issues found:

- Results card, verdict banner, sticky mini-bar on all four routes (no overlap, no horizontal overflow).
- Trade-card export flow on mobile: share/save overlay opens from a fresh tap, image renders, Web Share / save-to-photos path works.
- Direction pill alignment next to the asset label on the exported card (previous overlap fix — confirm it holds).

Still having trouble with downloading trade card. 

Perhaps more of a flow between the twbas

## 4. Publish

After the above passes build + QA, publish to `risk-wise-trade.lovable.app`.

## Out of scope (later)

- More MCP tools, accounts/saved plans (Lovable Cloud), Pro features — revisit after real-trader feedback.