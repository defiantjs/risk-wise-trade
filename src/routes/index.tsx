import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Info, RotateCcw, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type AssetType = "forex" | "gold" | "indices" | "crypto" | "stocks";

const ASSET_TYPES: { value: AssetType; label: string }[] = [
  { value: "forex", label: "Forex" },
  { value: "gold", label: "Gold" },
  { value: "indices", label: "Indices" },
  { value: "crypto", label: "Crypto" },
  { value: "stocks", label: "Stocks" },
];

export const Route = createFileRoute("/")({
  component: TradePlanChecker,
});

type Direction = "buy" | "sell";

const DEFAULTS = {
  balance: "",
  riskPct: "1",
  direction: "buy" as Direction,
  asset: "",
  entry: "",
  stop: "",
  tp: "",
};

function num(v: string): number | null {
  if (v === "" || v === "-" || v === ".") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function fmtMoney(v: number) {
  return v.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

type Grade = "A" | "B" | "C" | "Warning";

function TradePlanChecker() {
  const [s, setS] = useState(DEFAULTS);
  const set = <K extends keyof typeof DEFAULTS>(k: K, v: (typeof DEFAULTS)[K]) =>
    setS((prev) => ({ ...prev, [k]: v }));

  const result = useMemo(() => {
    const balance = num(s.balance);
    const riskPct = num(s.riskPct);
    const entry = num(s.entry);
    const stop = num(s.stop);
    const tp = num(s.tp);

    const ready =
      balance !== null && balance > 0 &&
      riskPct !== null && riskPct > 0 &&
      entry !== null && entry > 0 &&
      stop !== null && stop > 0 &&
      tp !== null && tp > 0 &&
      Math.abs(entry - stop) > 0;

    if (!ready) return { ready: false as const };

    const dollarRisk = (balance! * riskPct!) / 100;
    const stopDist = Math.abs(entry! - stop!);
    const targetDist = Math.abs(tp! - entry!);
    const rr = targetDist / stopDist;
    const reward = dollarRisk * rr;

    const directionMismatch =
      (s.direction === "buy" && (stop! >= entry! || tp! <= entry!)) ||
      (s.direction === "sell" && (stop! <= entry! || tp! >= entry!));

    const aggressiveRisk = riskPct! > 2;

    let grade: Grade;
    if (rr >= 3) grade = "A";
    else if (rr >= 2) grade = "B";
    else if (rr >= 1.5) grade = "C";
    else grade = "Warning";

    let coaching: string;
    if (rr < 1.5) coaching = "Reward profile is weak. This setup may not justify the risk.";
    else if (rr < 2) coaching = "Acceptable setup. Confirm structure, timing, and market context.";
    else coaching = "Strong reward profile. Still confirm market structure, DXY alignment, and news timing before entering.";

    const warnings: string[] = [];
    if (aggressiveRisk) warnings.push("Risk is aggressive. Consider reducing position size.");
    if (directionMismatch) {
      warnings.push(
        s.direction === "buy"
          ? "For a Buy: stop loss should be below entry and take profit above entry."
          : "For a Sell: stop loss should be above entry and take profit below entry."
      );
    }

    return {
      ready: true as const,
      dollarRisk,
      reward,
      rr,
      grade,
      coaching,
      warnings,
      aggressiveRisk,
    };
  }, [s]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
        {/* Header */}
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Trade Plan Checker</h1>
              <p className="text-xs text-muted-foreground sm:text-sm">Pre-trade risk &amp; reward sanity check</p>
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Inputs */}
          <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/20 backdrop-blur lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Trade inputs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Account balance" hint="USD">
                  <PrefixInput
                    prefix="$"
                    value={s.balance}
                    onChange={(v) => set("balance", v)}
                    placeholder="10,000"
                    inputMode="decimal"
                  />
                </Field>
                <Field label="Risk per trade" hint="% of balance">
                  <SuffixInput
                    suffix="%"
                    value={s.riskPct}
                    onChange={(v) => set("riskPct", v)}
                    placeholder="1"
                    inputMode="decimal"
                  />
                </Field>
              </div>

              <Field label="Direction">
                <div className="grid grid-cols-2 gap-2">
                  <DirectionButton
                    active={s.direction === "buy"}
                    tone="buy"
                    onClick={() => set("direction", "buy")}
                  >
                    <TrendingUp className="h-4 w-4" /> Buy
                  </DirectionButton>
                  <DirectionButton
                    active={s.direction === "sell"}
                    tone="sell"
                    onClick={() => set("direction", "sell")}
                  >
                    <TrendingDown className="h-4 w-4" /> Sell
                  </DirectionButton>
                </div>
              </Field>

              <Field label="Asset / pair">
                <Input
                  value={s.asset}
                  onChange={(e) => set("asset", e.target.value)}
                  placeholder="EURUSD, BTCUSD, AAPL…"
                  maxLength={20}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Entry">
                  <Input
                    value={s.entry}
                    onChange={(e) => set("entry", e.target.value)}
                    placeholder="0.00"
                    inputMode="decimal"
                    className="font-mono"
                  />
                </Field>
                <Field label="Stop loss">
                  <Input
                    value={s.stop}
                    onChange={(e) => set("stop", e.target.value)}
                    placeholder="0.00"
                    inputMode="decimal"
                    className="font-mono"
                  />
                </Field>
                <Field label="Take profit">
                  <Input
                    value={s.tp}
                    onChange={(e) => set("tp", e.target.value)}
                    placeholder="0.00"
                    inputMode="decimal"
                    className="font-mono"
                  />
                </Field>
              </div>

              <div className="flex items-center justify-end pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setS(DEFAULTS)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="mr-2 h-3.5 w-3.5" /> Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          <div className="lg:col-span-2">
            <Card className="sticky top-6 border-border/60 bg-card/80 shadow-xl shadow-black/20 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Results</CardTitle>
              </CardHeader>
              <CardContent>
                {result.ready ? (
                  <ResultsView
                    asset={s.asset}
                    direction={s.direction}
                    dollarRisk={result.dollarRisk}
                    reward={result.reward}
                    rr={result.rr}
                    grade={result.grade}
                    coaching={result.coaching}
                    warnings={result.warnings}
                  />
                ) : (
                  <EmptyResults />
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <p className="mt-10 text-center text-xs leading-relaxed text-muted-foreground">
          This tool is for educational purposes only and does not provide financial advice.
        </p>
      </div>
    </div>
  );
}

/* ---------- Subcomponents ---------- */

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

function PrefixInput({
  prefix,
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  prefix: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        {prefix}
      </span>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className="pl-7 font-mono"
      />
    </div>
  );
}

function SuffixInput({
  suffix,
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  suffix: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className="pr-8 font-mono"
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        {suffix}
      </span>
    </div>
  );
}

function DirectionButton({
  active,
  tone,
  children,
  onClick,
}: {
  active: boolean;
  tone: "buy" | "sell";
  children: React.ReactNode;
  onClick: () => void;
}) {
  const activeClass =
    tone === "buy"
      ? "bg-success/15 text-success ring-1 ring-success/40"
      : "bg-danger/15 text-danger ring-1 ring-danger/40";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-10 items-center justify-center gap-2 rounded-md border border-border/60 bg-secondary/40 text-sm font-medium transition-colors hover:bg-secondary",
        active && activeClass
      )}
    >
      {children}
    </button>
  );
}

function EmptyResults() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/60">
        <Info className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">
        Fill in your balance, risk, entry, stop, and target to see the analysis.
      </p>
    </div>
  );
}

function gradeStyle(grade: Grade, aggressiveOverride: boolean) {
  if (aggressiveOverride && grade !== "Warning") {
    // Risk too high = degrade visual to warning, but keep letter
    return { ring: "ring-warning/40", bg: "bg-warning/15", text: "text-warning", label: grade };
  }
  switch (grade) {
    case "A":
      return { ring: "ring-success/40", bg: "bg-success/15", text: "text-success", label: "A" };
    case "B":
      return { ring: "ring-success/40", bg: "bg-success/10", text: "text-success", label: "B" };
    case "C":
      return { ring: "ring-warning/40", bg: "bg-warning/15", text: "text-warning", label: "C" };
    case "Warning":
      return { ring: "ring-danger/40", bg: "bg-danger/15", text: "text-danger", label: "!" };
  }
}

function ResultsView({
  asset,
  direction,
  dollarRisk,
  reward,
  rr,
  grade,
  coaching,
  warnings,
}: {
  asset: string;
  direction: Direction;
  dollarRisk: number;
  reward: number;
  rr: number;
  grade: Grade;
  coaching: string;
  warnings: string[];
}) {
  const aggressive = warnings.some((w) => w.startsWith("Risk is aggressive"));
  const g = gradeStyle(grade, aggressive);

  return (
    <div className="space-y-5">
      {/* Grade */}
      <div className={cn("flex items-center gap-4 rounded-lg p-4 ring-1", g.bg, g.ring)}>
        <div className={cn("flex h-14 w-14 items-center justify-center rounded-md bg-background/40 text-2xl font-bold", g.text)}>
          {g.label}
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Trade grade</div>
          <div className="truncate text-sm font-medium">
            {asset ? asset.toUpperCase() : "Setup"}{" "}
            <span className={direction === "buy" ? "text-success" : "text-danger"}>
              · {direction === "buy" ? "Long" : "Short"}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Risk" value={fmtMoney(dollarRisk)} tone="danger" />
        <Stat label="Reward" value={fmtMoney(reward)} tone="success" />
        <Stat label="R : R" value={`${rr.toFixed(2)} : 1`} tone="neutral" />
      </div>

      {/* Coaching */}
      <div className="rounded-lg border border-border/60 bg-secondary/30 p-3">
        <div className="flex items-start gap-2">
          {grade === "A" || grade === "B" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
          ) : grade === "C" ? (
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-danger" />
          )}
          <p className="text-sm leading-relaxed text-foreground/90">{coaching}</p>
        </div>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <ul className="space-y-2">
          {warnings.map((w, i) => (
            <li
              key={i}
              className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-2.5 text-xs text-warning"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              <span className="leading-relaxed">{w}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "success" | "danger" | "neutral" }) {
  const toneClass =
    tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-foreground";
  return (
    <div className="rounded-md border border-border/60 bg-secondary/30 p-3">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-1 truncate font-mono text-sm font-semibold sm:text-base", toneClass)}>{value}</div>
    </div>
  );
}
