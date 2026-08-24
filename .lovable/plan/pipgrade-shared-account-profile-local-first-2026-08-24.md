# PipGrade — Shared Account Profile (Local-First)

One "account profile" stored in the browser, shared across Validate, Growth, and Scaling. Enter balance/risk once on any tool — the others start from it. No login required now; designed so cloud sync can slot in later.

## Shared profile fields

```text
balance        → Validate, Growth, Scaling
riskPct        → Validate, Growth, Scaling
accountType    → Scaling (challenge / funded live / personal)
winRate        → Growth (and future Scaling assumptions)
avgRR          → Growth
tradesPerWeek  → Growth (converted to trades/month, ×4.33)
```

## 1. New shared module: `src/lib/account-profile.ts`

- `AccountProfile` type with the six fields above (all strings, matching the existing input state shape).
- `loadAccountProfile()` / `saveAccountProfile(patch)` — read/write `localStorage` under one key (`pipgrade:account`), merging partial updates.
- A tiny `useAccountProfile()` hook: returns the stored profile (or `null` when nothing saved yet) plus a `saveProfile(patch)` that persists immediately. Client-only — reads happen in `useEffect`, so SSR renders current defaults with no hydration mismatch.

## 2. Wire each tool to the profile

Each route keeps its current local state as the source of truth while editing; the profile only seeds initial values and receives saves.

- **`/validate`** — on mount, seed `balance` and `riskPct` from the profile. When the user changes either, auto-save to the profile. Show a subtle one-line hint near the balance field ("Saved to your account — shared across all tools") the first time a value is stored.
- **`/growth`** — seed `balance`, `riskPct`, `winRate`, `avgRR` directly, and `tradesPerMonth` from `tradesPerWeek × 4.33` (rounded). Auto-save edits back. Replace the current `?balance&risk&rr` query-param handoff with the profile (the profile is now the handoff); remove the `handedOff` banner in favor of the same subtle "shared account" hint.
- **`/scaling`** — seed `balance`, `accountType`, and risk (map profile `riskPct` onto the closest preset choice, or `custom` when it doesn't match 0.25/0.5/1). Auto-save edits back.

## 3. Nav indicator (small)

Add a compact account chip in `SiteNav` (right of the nav pills on desktop, below on mobile) showing e.g. "$10,000 · 1% risk" when a profile exists, so the carry-over is visible. Not clickable in V1 — a full Account page comes with login later.

## 4. Guardrails

- Profile only ever *seeds* empty/default fields — it never overwrites a value the user has typed in the current session.
- Invalid/empty profile values fall back to each tool's existing defaults.
- No backend, no login, no new dependencies. The MCP tools and trade-card export are untouched.

## Later (not in this plan)

- Optional sign-in via Lovable Cloud that syncs the local profile to the cloud and unlocks saved trade plans/history. The profile module becomes the single sync point, so this is an additive change.
- "Trades per week" feeding Scaling's trade-frequency assumptions.
