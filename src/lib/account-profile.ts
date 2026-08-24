import { useEffect, useState } from "react";

/**
 * Shared account profile — one localStorage record that seeds and receives
 * the account-level inputs (balance, risk %, account type, stats) across the
 * Validate, Growth, and Scaling tools. Local-first by design: when cloud sync
 * arrives later, this module is the single sync point.
 *
 * All values are strings, matching the raw input state shape in each tool,
 * so seeding never involves lossy number formatting round-trips.
 */
export type AccountProfile = {
  balance?: string;
  riskPct?: string;
  accountType?: string; // "challenge" | "live" | "personal"
  winRate?: string;
  avgRR?: string;
  tradesPerWeek?: string;
};

const STORAGE_KEY = "pipgrade:account";
const CHANGE_EVENT = "pipgrade:account-changed";

const PROFILE_KEYS = [
  "balance",
  "riskPct",
  "accountType",
  "winRate",
  "avgRR",
  "tradesPerWeek",
] as const;

export function loadAccountProfile(): AccountProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const out: AccountProfile = {};
    for (const key of PROFILE_KEYS) {
      const v = (parsed as Record<string, unknown>)[key];
      if (typeof v === "string" && v.trim() !== "") out[key] = v;
    }
    return Object.keys(out).length > 0 ? out : null;
  } catch {
    return null;
  }
}

/**
 * Merge a patch into the stored profile. Empty strings clear that field;
 * omitted keys are left untouched.
 */
export function saveAccountProfile(patch: AccountProfile): void {
  if (typeof window === "undefined") return;
  try {
    const next: AccountProfile = { ...(loadAccountProfile() ?? {}) };
    for (const key of PROFILE_KEYS) {
      if (!(key in patch)) continue;
      const v = patch[key];
      if (typeof v === "string" && v.trim() !== "") next[key] = v;
      else delete next[key];
    }
    if (Object.keys(next).length > 0) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  } catch {
    // Storage unavailable (private mode, quota) — carry-over silently no-ops.
  }
}

/**
 * Live view of the stored profile for display surfaces (e.g. the nav chip).
 * Returns null during SSR and before hydration, then re-reads on every save
 * in this tab and on `storage` events from other tabs.
 */
export function useAccountProfile(): AccountProfile | null {
  const [profile, setProfile] = useState<AccountProfile | null>(null);

  useEffect(() => {
    const read = () => setProfile(loadAccountProfile());
    read();
    window.addEventListener(CHANGE_EVENT, read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener(CHANGE_EVENT, read);
      window.removeEventListener("storage", read);
    };
  }, []);

  return profile;
}
