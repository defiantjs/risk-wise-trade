import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Calendar,
  Copy,
  Check,
  ShieldAlert,
  Sparkles,
  Target,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteNav } from "@/components/site-nav";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/scaling")({ component: ScalingPlan });

/* ---------- Fixed system assumptions ----------
 * The Scaling Plan intentionally asks only 5 questions. Everything else is
 * derived from the same expectancy math used in the Growth Planner, plus a
 * couple of conservative, non-negotiable discipline constants — this keeps
 * the module honest (no invented target %) and consistent with the rest of
 * PipGrade's "one source of truth" philosophy.
 */
const SYSTEM_WIN_RATE = 0.5; // 50% win rate
const SYSTEM_MIN_RR = 1.5; // minimum 1.5R reward:risk

type AccountType = "challenge" | "live" | "personal";
type Goal = "pass" | "grow" | "payout" | "consistency";
type RiskChoice = "0.25" | "0.5" | "1" | "custom";
type TimeframeChoice = "7" | "14" | "21" | "30" | "custom";

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: "challenge", label: "Funded Challenge" },
  { value: "live", label: "Funded Live" },
  { value: "personal", label: "Personal" },
];

const GOALS: { value: Goal; label: string }[] = [
  { value: "pass", label: "Pass Challenge" },
  { value: "grow", label: "Grow Account" },
  { value: "payout", label: "Reach Payout" },
  { value: "consistency", label: "Build Consistency" },
];

const RISK_CHOICES: { value: RiskChoice; label: string }[] = [
  { value: "0.25", label: "0.25%" },
  { value: "0.5", label: "0.5%" },
  { value: "1", label: "1%" },
  { value: "custom", label: "Custom" },
];

const TIMEFRAME_CHOICES: { value: TimeframeChoice; label: string }[] = [
  { value: "7", label: "7 days" },
  { value: "14", label: "14 days" },
  { value: "21", label: "21 days" },
  { value: "30", label: "30 days" },
  { value: "custom", label: "Custom" },
];

const ARCHETYPES: Record<Goal, { title: string; quote: string }> = {
  pass: { title: "The Challenge Breaker", quote: "Discipline is the fastest path through the gate." },
  grow: { title: "The Compounder", quote: "Small edges, repeated without exception, become fortunes." },
  payout: { title: "The Payout Operator", quote: "Extract what's earned. Protect what remains." },
  consistency: { title: "The Process Guardian", quote: "Consistency isn't glamorous. It's just the only thing that compounds." },
};

const DEFAULTS = {
  balance: "100000",
  accountType: "personal" as AccountType,
  goal: "grow" as Goal,
  riskChoice: "1" as RiskChoice,
  riskCustom: "1.5",
  timeframeChoice: "21" as TimeframeChoice,
  timeframeCustom: "45",
};

function num(v: string): number | null {
  const n = Number(v.replace(/[, _]/g, "").trim());
  return Number.isFinite(n) && v.trim() !== "" ? n : null;
}

function fmtMoney(v: number, decimals = 0) {
  return v.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: decimals });
}

function maxTradesForGoal(goal: Goal): number {
  return goal === "consistency" ? 1 : 2;
}

function ScalingPlan() {
  const [s, setS] = useState(DEFAULTS);
  const set = <K extends keyof typeof DEFAULTS>(k: K, v: (typeof DEFAULTS)[K]) =>
    setS((prev) => ({ ...prev, [k]: v }));
  const [copied, setCopied] = useState(false);

  const model = useMemo(() => {
    const balance = num(s.balance);
    const riskPct = s.riskChoice === "custom" ? num(s.riskCustom) : Number(s.riskChoice);
    const days = s.timeframeChoice === "custom" ? num(s.timeframeCustom) : Number(s.timeframeChoice);

    const ready =
      balance !== null && balance > 0 &&
      riskPct !== null && riskPct > 0 && riskPct <= 100 &&
      days !== null && days > 0 && days <= 365;

    if (!ready) return { ready: false as const };

    const maxTradesPerDay = maxTradesForGoal(s.goal);
    const r = riskPct! / 100;
    const expectancyFraction = SYSTEM_WIN_RATE * (r * SYSTEM_MIN_RR) - (1 - SYSTEM_WIN_RATE) * r;
    const dailyEdge = Math.pow(1 + expectancyFraction, maxTradesPerDay) - 1;

    const calendar: { day: number; balance: number; phase?: string }[] = [];
    let bal = balance!;
    for (let d = 1; d <= days!; d++) {
      bal = bal * (1 + dailyEdge);
      calendar.push({ day: d, balance: bal });
    }

    const foundationDay = Math.max(1, Math.round(days! * 0.25));
    const accelerationDay = Math.max(1, Math.round(days! * 0.5));
    const compressionDay = Math.max(1, Math.round(days! * 0.75));
    const labeled = new Set<number>();
    const applyPhase = (day: number, label: string) => {
      const entry = calendar.find((c) => c.day === day);
      if (entry && !labeled.has(day)) {
        entry.phase = label;
        labeled.add(day);
      }
    };
    applyPhase(foundationDay, "Foundation");
    applyPhase(accelerationDay, "Acceleration");
    applyPhase(compressionDay, "Compression");
    applyPhase(days!, "Extraction");

    const target = calendar[calendar.length - 1].balance;
    const growthPct = ((target - balance!) / balance!) * 100;
    const riskDollar = balance! * r;
    const maxDailyLossPct = riskPct! * maxTradesPerDay;
    const maxDailyLossDollar = balance! * (maxDailyLossPct / 100);
    const dailyProfitTarget = balance! * dailyEdge;

    return {
      ready: true as const,
      balance: balance!,
      days: days!,
      riskPct: riskPct!,
      target,
      growthPct,
      dailyEdge: dailyEdge * 100,
      calendar,
      maxTradesPerDay,
      riskDollar,
      maxDailyLossPct,
      maxDailyLossDollar,
      dailyProfitTarget,
      isFlatOrNegative: expectancyFraction <= 0,
    };
  }, [s]);

  const accountTypeLabel = ACCOUNT_TYPES.find((a) => a.value === s.accountType)!.label;
  const goalLabel = GOALS.find((g) => g.value === s.goal)!.label;
  const archetype = ARCHETYPES[s.goal];

  const posterPrompt = model.ready
    ? `Hyper-realistic premium fintech infographic poster, portrait orientation, deep charcoal background, brushed purple and champagne-pink accents with a soft orange highlight, clean white typography. Title in bold serif: "THE SCALING SYSTEM". Subtitle in thin spaced caps: "FROM PLAN TO EXECUTION". Operator panel: "${accountTypeLabel.toUpperCase()} · ${goalLabel.toUpperCase()}". Centerpiece: an elegant upward equity curve from ${fmtMoney(model.balance)} to ${fmtMoney(model.target)} over ${model.days} days, gradient line on charcoal with glowing milestone nodes labeled Foundation, Acceleration, Compression, Extraction. Right side: ${model.days}-day compounding calendar grid with daily balance values, final day highlighted bright purple-gold. Four KPI tiles: CAPITAL ${fmtMoney(model.balance)} · TARGET ${fmtMoney(model.target)} · RISK/TRADE ${model.riskPct}% · DAILY CAP ${model.maxDailyLossPct.toFixed(2)}%. Execution commandments numbered 01–05 in clean sans-serif. Pull quote in italic serif: "${archetype.quote}". Bottom tagline in spaced caps: "EVERY TRADE DESERVES A GRADE BEFORE IT DESERVES YOUR CAPITAL." Cinematic spotlight, museum-grade typography, Bloomberg terminal meets Rolex catalogue. Premium fintech dashboard aesthetic.`
    : "";

  const handleCopy = () => {
    if (!posterPrompt) return;
    navigator.clipboard?.writeText(posterPrompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const commandments = model.ready
    ? [
        "Never chase. Wait for the A+ setup.",
        s.accountType === "personal"
          ? "Honor the daily loss cap — it's your capital, not the market's."
          : "Honor the daily loss cap — no exceptions, no negotiation.",
        `Max ${model.maxTradesPerDay} trade${model.maxTradesPerDay > 1 ? "s" : ""} per day is a ceiling, not a quota.`,
        "No trade without a written thesis logged before entry.",
        "Stop trading the moment emotion enters the seat.",
      ]
    : [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-2 sm:px-6">
        <header className="mb-8">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Scaling Plan</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Five questions, one blueprint. PipGrade turns your account goal into a day-by-day execution
            roadmap — built on the same discipline math as everything else here.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Inputs */}
          <Card className="glass border-border/50 shadow-xl shadow-black/20 lg:col-span-2 lg:self-start lg:sticky lg:top-20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Wallet className="h-4 w-4 text-primary" /> Five questions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <Field label="1. Starting account balance" hint="USD">
                <PrefixInput value={s.balance} onChange={(v) => set("balance", v)} placeholder="100,000" />
              </Field>

              <Field label="2. Account type">
                <ChoiceGroup options={ACCOUNT_TYPES} value={s.accountType} onChange={(v) => set("accountType", v)} cols={1} />
              </Field>

              <Field label="3. Target goal">
                <ChoiceGroup options={GOALS} value={s.goal} onChange={(v) => set("goal", v)} cols={2} />
              </Field>

              <Field label="4. Risk per trade">
                <ChoiceGroup options={RISK_CHOICES} value={s.riskChoice} onChange={(v) => set("riskChoice", v)} cols={2} />
                {s.riskChoice === "custom" && (
                  <div className="mt-2">
                    <SuffixInput value={s.riskCustom} onChange={(v) => set("riskCustom", v)} placeholder="1.5" />
                  </div>
                )}
              </Field>

              <Field label="5. Timeframe">
                <ChoiceGroup options={TIMEFRAME_CHOICES} value={s.timeframeChoice} onChange={(v) => set("timeframeChoice", v)} cols={2} />
                {s.timeframeChoice === "custom" && (
                  <div className="mt-2">
                    <Input value={s.timeframeCustom} onChange={(e) => set("timeframeCustom", e.target.value)} placeholder="45" inputMode="decimal" className="font-mono" />
                  </div>
                )}
              </Field>

              <p className="rounded-md border border-border/40 bg-background/40 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
                System assumption: {(SYSTEM_WIN_RATE * 100).toFixed(0)}% win rate, {SYSTEM_MIN_RR}R minimum reward:risk,
                max {model.ready ? model.maxTradesPerDay : maxTradesForGoal(s.goal)} validated trade
                {model.ready && model.maxTradesPerDay > 1 ? "s" : ""}/day. Tighten your execution, not this number.
              </p>
            </CardContent>
          </Card>

          {/* Output */}
          <div className="space-y-6 lg:col-span-3">
            {!model.ready ? (
              <Card className="glass border-primary/25">
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  Fill in all five questions to generate your scaling blueprint.
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Snapshot */}
                <Card className="glass border-primary/25 shadow-2xl shadow-primary/10 ring-1 ring-primary/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                      <Target className="h-4 w-4 text-primary" /> Your Scaling Snapshot
                    </CardTitle>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                        {accountTypeLabel}
                      </span>
                      <span className="rounded-full bg-pink/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-pink">
                        {goalLabel}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      <Stat label="Capital" value={fmtMoney(model.balance)} />
                      <Stat label="Target" value={fmtMoney(model.target)} tone="success" />
                      <Stat label="Growth" value={`+${model.growthPct.toFixed(1)}%`} tone="success" />
                      <Stat label="Days" value={String(model.days)} />
                      <Stat label="Daily edge" value={`${model.dailyEdge.toFixed(2)}%`} />
                      <Stat label="Risk / trade" value={`${model.riskPct}%`} />
                    </div>
                    {model.isFlatOrNegative && (
                      <p className="mt-3 flex items-start gap-2 rounded-md border border-danger/30 bg-danger/10 p-2.5 text-xs text-danger">
                        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                        At the system's 50% / 1.5R assumption, this risk level doesn't produce positive expectancy.
                        The blueprint below is still shown, but raise your minimum R:R before trading it live.
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Daily Target Calendar */}
                <Card className="glass border-border/50 shadow-xl shadow-black/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                      <Calendar className="h-4 w-4 text-primary" /> Daily Target Calendar
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-7">
                      {model.calendar.map((c) => (
                        <div
                          key={c.day}
                          className={cn(
                            "rounded-md border p-2 text-center",
                            c.day === model.days
                              ? "border-primary/50 bg-gradient-to-br from-primary/30 to-pink/20 shadow-[0_0_20px_-6px_var(--primary)]"
                              : "border-border/50 bg-secondary/20"
                          )}
                        >
                          <div className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">Day {c.day}</div>
                          <div className="mt-0.5 font-mono text-xs font-semibold sm:text-sm">{fmtMoney(c.balance)}</div>
                          {c.phase && (
                            <div className="mt-0.5 text-[8px] font-semibold uppercase tracking-wider text-primary">{c.phase}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Risk Rules */}
                <Card className="glass border-border/50 shadow-xl shadow-black/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                      <ShieldAlert className="h-4 w-4 text-primary" /> Risk Rules
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-2 sm:grid-cols-2">
                    <RuleRow label="Risk per trade" value={`${model.riskPct}% · ${fmtMoney(model.riskDollar)}`} />
                    <RuleRow label="Max daily loss" value={`${model.maxDailyLossPct.toFixed(2)}% · ${fmtMoney(model.maxDailyLossDollar)}`} />
                    <RuleRow label="Max trades / day" value={String(model.maxTradesPerDay)} />
                    <RuleRow label="Daily profit target" value={fmtMoney(model.dailyProfitTarget)} />
                    <RuleRow
                      label="Losing streak protocol"
                      value={`${model.maxTradesPerDay} reds → stop for the day · ${model.maxTradesPerDay + 1} reds → half size next day · 5 reds this week → 48h reset`}
                      wide
                    />
                    <RuleRow
                      label="Win-rate assumption"
                      value={`${(SYSTEM_WIN_RATE * 100).toFixed(0)}% with min ${SYSTEM_MIN_RR}R reward / risk`}
                      wide
                    />
                  </CardContent>
                </Card>

                {/* Execution Commandments */}
                <Card className="glass border-border/50 shadow-xl shadow-black/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold">Execution Commandments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ol className="space-y-2.5">
                      {commandments.map((c, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm">
                          <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-[10px] font-bold text-primary">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span className="text-foreground/85">{c}</span>
                        </li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>

                {/* Trader Identity */}
                <Card className="glass border-primary/25 shadow-xl shadow-black/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                      <Sparkles className="h-4 w-4 text-primary" /> Trader Identity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Archetype</div>
                    <div className="brand-gradient-text mt-1 text-2xl font-bold tracking-tight">{archetype.title}</div>
                    <p className="mt-2 italic text-foreground/80">&ldquo;{archetype.quote}&rdquo;</p>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {accountTypeLabel} operator on a {model.days}-day mission: convert {fmtMoney(model.balance)} into{" "}
                      {fmtMoney(model.target)} through {model.dailyEdge.toFixed(2)}% daily compounding. Your edge is not
                      prediction — it's execution. Trade the plan. Honor the rules. The market rewards the disciplined.
                    </p>
                  </CardContent>
                </Card>

                {/* Poster Prompt */}
                <Card className="glass border-border/50 shadow-xl shadow-black/20">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold">Personalized Poster Prompt</CardTitle>
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 rounded-md border border-border/60 bg-secondary/40 px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-secondary"
                      >
                        {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                        {copied ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <p className="pt-1 text-[11px] text-muted-foreground">Drop into your favorite AI image generator.</p>
                  </CardHeader>
                  <CardContent>
                    <p className="rounded-md border border-border/40 bg-background/40 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
                      {posterPrompt}
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>

        <p className="mt-10 text-center text-xs leading-relaxed text-muted-foreground">
          This tool is for educational purposes only and does not provide financial advice.
        </p>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</Label>
        {hint && <span className="text-[10px] text-muted-foreground/70">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function PrefixInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} inputMode="decimal" className="pl-7 font-mono" />
    </div>
  );
}

function SuffixInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} inputMode="decimal" className="pr-8 font-mono" />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
    </div>
  );
}

function ChoiceGroup<T extends string>({
  options, value, onChange, cols,
}: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; cols: 1 | 2 }) {
  return (
    <div className={cn("grid gap-2", cols === 1 ? "grid-cols-1" : "grid-cols-2")}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md border px-3 py-2 text-xs font-semibold transition-colors",
            value === o.value
              ? "border-primary/60 bg-primary/20 text-primary shadow-[0_0_16px_-6px_var(--primary)]"
              : "border-border/60 bg-secondary/30 text-muted-foreground hover:text-foreground"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "success" }) {
  return (
    <div className="rounded-md border border-border/60 bg-secondary/30 p-3">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-1 truncate font-mono text-sm font-semibold sm:text-base", tone === "success" ? "text-success" : "text-foreground")}>
        {value}
      </div>
    </div>
  );
}

function RuleRow({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={cn("rounded-md border border-border/60 bg-secondary/30 p-3", wide && "sm:col-span-2")}>
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-xs font-medium leading-relaxed text-foreground sm:text-sm">{value}</div>
    </div>
  );
}
