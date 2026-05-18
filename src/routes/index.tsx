import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Download,
  Info,
  Package,
  RotateCcw,
  Scale,
  TrendingDown,
  TrendingUp,
  Wallet,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type AssetType = "forex" | "gold" | "indices" | "crypto" | "stocks";
type Direction = "buy" | "sell";
type SizingMode = "quick" | "advanced";

const ASSET_TYPES: {
  value: AssetType;
  label: string;
  pipValue: string;
  unit: string;
  hint: string;
}[] = [
  { value: "forex", label: "Forex", pipValue: "10", unit: "lots", hint: "Standard lot ≈ $10/pip on USD-quoted pairs." },
  { value: "gold", label: "Gold", pipValue: "1", unit: "oz", hint: "XAUUSD ≈ $1 per $0.01 move per 1 oz contract." },
  { value: "indices", label: "Indices", pipValue: "1", unit: "contracts", hint: "Typical CFD ≈ $1 per point per contract. Verify with broker." },
  { value: "crypto", label: "Crypto", pipValue: "1", unit: "units", hint: "Spot crypto ≈ $1 per $1 move per 1 unit." },
  { value: "stocks", label: "Stocks", pipValue: "1", unit: "shares", hint: "$1 move per share = $1 P&L per share." },
];

export const Route = createFileRoute("/")({ component: TradePlanChecker });

const DEFAULTS = {
  balance: "",
  riskPct: "1",
  direction: "buy" as Direction,
  asset: "",
  entry: "",
  stop: "",
  tp: "",
  assetType: "forex" as AssetType,
  pipValue: "10",
  unitLabel: "lots",
  sizingMode: "quick" as SizingMode,
};

function num(v: string): number | null {
  if (typeof v !== "string") return null;
  const cleaned = v.replace(/[, _]/g, "").trim();
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function safe(n: number | null | undefined): number | null {
  return n !== null && n !== undefined && Number.isFinite(n) ? n : null;
}

function fmtMoney(v: number) {
  return v.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

type Grade = "A" | "B" | "C" | "Warning";
type Verdict = "valid" | "adjust" | "no";

const GRADE_LABEL: Record<Grade, string> = {
  A: "Elite Setup",
  B: "Valid Setup",
  C: "Marginal Setup",
  Warning: "Invalid",
};

function TradePlanChecker() {
  const [s, setS] = useState(DEFAULTS);
  const set = <K extends keyof typeof DEFAULTS>(k: K, v: (typeof DEFAULTS)[K]) =>
    setS((prev) => ({ ...prev, [k]: v }));

  // Auto-fill pip value + unit when in Quick mode and asset type changes
  useEffect(() => {
    if (s.sizingMode !== "quick") return;
    const a = ASSET_TYPES.find((x) => x.value === s.assetType)!;
    setS((prev) => ({ ...prev, pipValue: a.pipValue, unitLabel: a.unit }));
  }, [s.assetType, s.sizingMode]);

  const result = useMemo(() => {
    const balance = num(s.balance);
    const riskPct = num(s.riskPct);
    const entry = num(s.entry);
    const stop = num(s.stop);
    const tp = num(s.tp);
    const pipValue = num(s.pipValue);

    const sizingReady =
      balance !== null && balance > 0 &&
      riskPct !== null && riskPct > 0 &&
      entry !== null && entry > 0 &&
      stop !== null && stop > 0 &&
      pipValue !== null && pipValue > 0 &&
      Math.abs(entry - stop) > 0;

    const ready = sizingReady && tp !== null && tp > 0;

    if (!sizingReady) {
      const partialDollarRisk =
        balance !== null && balance > 0 && riskPct !== null && riskPct > 0
          ? safe((balance * riskPct) / 100)
          : null;
      return { ready: false as const, sizingReady: false as const, dollarRisk: partialDollarRisk, suggestedSize: null };
    }

    const stopDist = Math.abs(entry! - stop!);
    const targetDist = tp !== null && tp > 0 ? Math.abs(tp - entry!) : null;
    const dollarRisk = safe((balance! * riskPct!) / 100);
    const rr = targetDist !== null && stopDist > 0 ? safe(targetDist / stopDist) : null;
    const reward = dollarRisk !== null && rr !== null ? safe(dollarRisk * rr) : null;
    const moveToStopPct = entry! > 0 ? safe((stopDist / entry!) * 100) : null;
    const moveToTargetPct = entry! > 0 && targetDist !== null ? safe((targetDist / entry!) * 100) : null;
    const suggestedSize =
      pipValue !== null && pipValue > 0 && stopDist > 0 && dollarRisk !== null
        ? safe(dollarRisk / (stopDist * pipValue))
        : null;

    if (!ready) {
      return {
        ready: false as const,
        sizingReady: true as const,
        dollarRisk,
        suggestedSize,
        moveToStopPct,
        assetType: s.assetType,
        unitLabel: s.unitLabel,
      };
    }

    const directionMismatch =
      (s.direction === "buy" && (stop! >= entry! || tp! <= entry!)) ||
      (s.direction === "sell" && (stop! <= entry! || tp! >= entry!));

    const aggressiveRisk = riskPct! > 2;

    // Round to 2 decimals for threshold comparisons so displayed R:R matches grading.
    const rrCmp = rr !== null ? Math.round(rr * 100) / 100 : null;
    const riskCmp = Math.round(riskPct! * 100) / 100;

    let grade: Grade;
    if (rrCmp !== null && rrCmp >= 3 && riskCmp <= 1) grade = "A";
    else if (rrCmp !== null && rrCmp >= 2 && riskCmp <= 2) grade = "B";
    else if (rrCmp !== null && rrCmp >= 1.5 && rrCmp < 2 && riskCmp <= 2) grade = "C";
    else grade = "Warning";

    let verdict: Verdict;
    if (rrCmp !== null && rrCmp >= 2 && riskCmp <= 2) verdict = "valid";
    else if (rrCmp !== null && rrCmp >= 1.5 && rrCmp < 2 && riskCmp <= 2) verdict = "adjust";
    else verdict = "no";

    let coaching: string;
    if (rrCmp === null || rrCmp < 1.5) coaching = "Reward profile is weak. This setup may not justify the risk.";
    else if (rrCmp < 2) coaching = "Acceptable setup. Confirm structure, timing, and market context.";
    else coaching = "Strong reward profile. Still confirm market structure, DXY alignment, and news timing before entering.";

    const warnings: string[] = [];
    if (aggressiveRisk) warnings.push("Risk is aggressive. Consider reducing position size.");
    if (directionMismatch) warnings.push("Trade levels do not match selected direction.");

    return {
      ready: true as const,
      dollarRisk,
      reward,
      rr,
      grade,
      verdict,
      coaching,
      warnings,
      moveToStopPct,
      moveToTargetPct,
      suggestedSize,
      assetType: s.assetType,
      unitLabel: s.unitLabel,
    };
  }, [s]);

  const formatSize = (size: number) => {
    const label = s.sizingMode === "quick"
      ? ASSET_TYPES.find((a) => a.value === s.assetType)!.unit
      : s.unitLabel?.trim() || "units";
    const decimalsByAsset: Record<AssetType, number> = {
      forex: 2, gold: 2, indices: 2, crypto: 4, stocks: 2,
    };
    const decimals = decimalsByAsset[s.assetType] ?? 2;
    return `${size.toLocaleString(undefined, {
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals,
    })} ${label}`;
  };

  const sizeText =
    result.ready && result.suggestedSize !== null && Number.isFinite(result.suggestedSize)
      ? formatSize(result.suggestedSize)
      : "—";

  const dash = "—";
  const moneyOrDash = (n: number | null) => (n === null ? dash : fmtMoney(n));
  const rrText = result.ready && result.rr !== null ? `${result.rr.toFixed(2)} : 1` : dash;
  const moveStopText = result.ready && result.moveToStopPct !== null ? `${result.moveToStopPct.toFixed(2)}%` : dash;
  const moveTargetText = result.ready && result.moveToTargetPct !== null ? `${result.moveToTargetPct.toFixed(2)}%` : dash;
  const riskText = result.ready ? moneyOrDash(result.dollarRisk) : dash;
  const rewardText = result.ready ? moneyOrDash(result.reward) : dash;

  // Size validation messages
  const entryN = num(s.entry);
  const stopN = num(s.stop);
  const pipN = num(s.pipValue);
  const stopDistValid = entryN !== null && stopN !== null && Math.abs(entryN - stopN) > 0;
  const pipValid = pipN !== null && pipN > 0;
  const sizeNote = !stopDistValid
    ? "Enter a valid stop loss to calculate size."
    : !pipValid
      ? "Enter a valid pip/point value."
      : null;

  const riskConfirmText =
    result.ready && result.suggestedSize !== null && result.dollarRisk !== null
      ? `At this size, max account risk = ${num(s.riskPct)}% / ${fmtMoney(result.dollarRisk)}`
      : null;

  const handleSave = () => {
    if (!result.ready) return;
    const lines = [
      "TRADE PLAN",
      "==========",
      `Asset: ${s.asset || "—"}`,
      `Direction: ${s.direction.toUpperCase()}`,
      `Entry: ${s.entry}   Stop: ${s.stop}   Target: ${s.tp}`,
      "",
      `Account Balance: ${fmtMoney(num(s.balance)!)}`,
      `Risk %: ${s.riskPct}%`,
      `Dollar Risk: ${riskText}`,
      `Estimated Reward: ${rewardText}`,
      `R:R: ${rrText}`,
      `Move to Stop: ${moveStopText}`,
      `Move to Target: ${moveTargetText}`,
      `Suggested Size: ${sizeText}`,
      "",
      `Grade: ${result.grade} (${GRADE_LABEL[result.grade]})`,
      `Verdict: ${verdictText(result.verdict)}`,
      "",
      `Generated: ${new Date().toLocaleString()}`,
    ].join("\n");

    const blob = new Blob([lines], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trade-plan-${s.asset || "setup"}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sticky mini bar */}
      {result.ready && (
        <MiniBar
          risk={riskText}
          rr={rrText}
          size={sizeText}
          grade={result.grade}
        />
      )}

      <div className="mx-auto max-w-6xl px-4 py-10 pb-28 sm:px-6 lg:py-14 lg:pb-14 lg:pt-24">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-primary/5 text-primary ring-1 ring-primary/40 shadow-[0_0_24px_-6px_var(--primary)]">
              <Activity className="h-5 w-5" />
              <span className="absolute -inset-px rounded-xl ring-1 ring-inset ring-white/5" />
            </div>
            <div>
              <h1 className="bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-xl font-semibold tracking-tight text-transparent sm:text-2xl">PipGrade</h1>
              <p className="text-xs text-muted-foreground sm:text-sm">Pre-trade validation and execution framework</p>
              <p className="mt-0.5 hidden text-[11px] italic text-muted-foreground/70 sm:block">Validate risk. Grade setups. Execute with confidence.</p>
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Inputs */}
          <Card className="glass border-border/50 shadow-xl shadow-black/20 lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Trade inputs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 1. Account + Risk */}
              <Section title="1. Account & risk" icon={<Wallet className="h-3.5 w-3.5" />}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Account balance" hint="USD">
                    <PrefixInput prefix="$" value={s.balance} onChange={(v) => set("balance", v)} placeholder="10,000" inputMode="decimal" />
                  </Field>
                  <Field label="Risk per trade" hint="% of balance">
                    <SuffixInput suffix="%" value={s.riskPct} onChange={(v) => set("riskPct", v)} placeholder="1" inputMode="decimal" />
                  </Field>
                </div>
              </Section>

              {/* 2. Position Sizing */}
              <Section title="2. Position sizing" icon={<Package className="h-3.5 w-3.5" />}>
                <div className="mb-3 inline-flex rounded-md border border-border/60 bg-secondary/30 p-0.5">
                  {([
                    { key: "quick" as SizingMode, label: "Auto Size" },
                    { key: "advanced" as SizingMode, label: "Advanced" },
                  ]).map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => set("sizingMode", m.key)}
                      className={cn(
                        "rounded px-3 py-1 text-xs font-medium transition-colors",
                        s.sizingMode === m.key
                          ? "bg-primary text-primary-foreground shadow"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <p className="mb-3 text-[11px] leading-relaxed text-muted-foreground">
                  {s.sizingMode === "quick"
                    ? "PipGrade automatically calculates the recommended execution size based on your account risk and stop distance."
                    : "Use Advanced mode if your broker uses different pip, point, contract, or lot values."}
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Asset type">
                    <Select value={s.assetType} onValueChange={(v) => set("assetType", v as AssetType)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ASSET_TYPES.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  {s.sizingMode === "advanced" ? (
                    <Field label="Unit label">
                      <Input value={s.unitLabel} onChange={(e) => set("unitLabel", e.target.value)} placeholder="lots" maxLength={20} />
                    </Field>
                  ) : (
                    <Field label="Unit">
                      <Input value={ASSET_TYPES.find((a) => a.value === s.assetType)!.unit} disabled className="bg-muted/40" />
                    </Field>
                  )}
                </div>
                {s.sizingMode === "advanced" && (
                  <div className="mt-4">
                    <Field label="Pip / point value" hint="USD per unit">
                      <PrefixInput prefix="$" value={s.pipValue} onChange={(v) => set("pipValue", v)} placeholder="10" inputMode="decimal" />
                    </Field>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">Value per pip/point for 1 lot, contract, or unit.</p>
                  </div>
                )}
                <p className="mt-3 rounded-md border border-border/40 bg-background/40 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
                  {ASSET_TYPES.find((a) => a.value === s.assetType)!.hint}
                  {s.sizingMode === "quick" && (
                    <span className="text-foreground"> Auto-set to ${ASSET_TYPES.find((a) => a.value === s.assetType)!.pipValue}/pip.</span>
                  )}
                </p>
              </Section>


              {/* 3. Trade Levels */}
              <Section title="3. Trade levels" icon={<Activity className="h-3.5 w-3.5" />}>
                <Field label="Direction">
                  <div className="grid grid-cols-2 gap-2">
                    <DirectionButton active={s.direction === "buy"} tone="buy" onClick={() => set("direction", "buy")}>
                      <TrendingUp className="h-4 w-4" /> Buy
                    </DirectionButton>
                    <DirectionButton active={s.direction === "sell"} tone="sell" onClick={() => set("direction", "sell")}>
                      <TrendingDown className="h-4 w-4" /> Sell
                    </DirectionButton>
                  </div>
                </Field>
                <div className="mt-4">
                  <Field label="Asset / pair">
                    <Input value={s.asset} onChange={(e) => set("asset", e.target.value)} placeholder="EURUSD, BTCUSD, AAPL…" maxLength={20} />
                  </Field>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <Field label="Entry">
                    <Input value={s.entry} onChange={(e) => set("entry", e.target.value)} placeholder="0.00" inputMode="decimal" className="font-mono" />
                  </Field>
                  <Field label="Stop loss">
                    <Input value={s.stop} onChange={(e) => set("stop", e.target.value)} placeholder="0.00" inputMode="decimal" className="font-mono" />
                  </Field>
                  <Field label="Take profit">
                    <Input value={s.tp} onChange={(e) => set("tp", e.target.value)} placeholder="0.00" inputMode="decimal" className="font-mono" />
                  </Field>
                </div>
              </Section>

              <div className="flex items-center justify-end pt-2">
                <Button variant="ghost" size="sm" onClick={() => setS(DEFAULTS)} className="text-muted-foreground hover:text-foreground">
                  <RotateCcw className="mr-2 h-3.5 w-3.5" /> Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          <div className="lg:col-span-2">
            <Card className="glass sticky top-20 border-primary/25 shadow-2xl shadow-primary/10 ring-1 ring-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Results</CardTitle>
              </CardHeader>
              <CardContent>
                {result.ready ? (
                  <ResultsView
                    asset={s.asset}
                    direction={s.direction}
                    riskText={riskText}
                    rewardText={rewardText}
                    rrText={rrText}
                    grade={result.grade}
                    verdict={result.verdict}
                    coaching={result.coaching}
                    warnings={result.warnings}
                    moveToStopText={moveStopText}
                    moveToTargetText={moveTargetText}
                    sizeText={sizeText}
                    sizeNote={sizeNote}
                    riskConfirmText={riskConfirmText}
                    onSave={handleSave}
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

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/40 bg-secondary/10 p-4">
      <div className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground/70">
        {icon}
        {title}
      </div>
      {children}
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

function PrefixInput({ prefix, value, onChange, placeholder, inputMode }: {
  prefix: string; value: string; onChange: (v: string) => void;
  placeholder?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{prefix}</span>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} inputMode={inputMode} className="pl-7 font-mono" />
    </div>
  );
}

function SuffixInput({ suffix, value, onChange, placeholder, inputMode }: {
  suffix: string; value: string; onChange: (v: string) => void;
  placeholder?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <div className="relative">
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} inputMode={inputMode} className="pr-8 font-mono" />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{suffix}</span>
    </div>
  );
}

function DirectionButton({ active, tone, children, onClick }: {
  active: boolean; tone: "buy" | "sell"; children: React.ReactNode; onClick: () => void;
}) {
  const activeClass =
    tone === "buy"
      ? "bg-success/20 text-success ring-2 ring-success/60 shadow-[0_0_20px_-4px_var(--success)]"
      : "bg-danger/20 text-danger ring-2 ring-danger/60 shadow-[0_0_20px_-4px_var(--danger)]";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-11 items-center justify-center gap-2 rounded-md border border-border/60 bg-secondary/40 text-sm font-semibold transition-all duration-200 hover:bg-secondary",
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
      <p className="text-sm text-muted-foreground">Enter trade levels to validate your setup.</p>
    </div>
  );
}

function verdictText(v: Verdict) {
  if (v === "valid") return "✅ VALID SETUP";
  if (v === "adjust") return "⚠ ADJUST BEFORE ENTRY";
  return "❌ DO NOT TAKE THIS TRADE";
}

function VerdictBanner({ verdict }: { verdict: Verdict }) {
  const cfg = {
    valid: { grad: "from-success/25 via-success/10 to-transparent", ring: "ring-success/40", text: "text-success", glow: "shadow-[0_0_40px_-12px_var(--success)]", icon: <CheckCircle2 className="h-6 w-6" />, label: "VALID SETUP", sub: "Risk and reward profile meet the threshold." },
    adjust: { grad: "from-warning/25 via-warning/10 to-transparent", ring: "ring-warning/40", text: "text-warning", glow: "shadow-[0_0_40px_-12px_var(--warning)]", icon: <AlertTriangle className="h-6 w-6" />, label: "ADJUST BEFORE ENTRY", sub: "Reward is borderline. Tighten stop or extend target." },
    no: { grad: "from-danger/25 via-danger/10 to-transparent", ring: "ring-danger/40", text: "text-danger", glow: "shadow-[0_0_40px_-12px_var(--danger)]", icon: <XCircle className="h-6 w-6" />, label: "DO NOT TAKE THIS TRADE", sub: "Reward is too low or risk is too aggressive." },
  }[verdict];

  return (
    <div
      key={verdict}
      className={cn(
        "animate-in fade-in zoom-in-95 duration-300 relative overflow-hidden rounded-xl bg-gradient-to-br p-4 ring-1",
        cfg.grad, cfg.ring, cfg.glow
      )}
    >
      <div className={cn("flex items-center gap-3", cfg.text)}>
        {cfg.icon}
        <div className="text-base font-bold tracking-wide sm:text-lg">{cfg.label}</div>
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-foreground/80">{cfg.sub}</p>
    </div>
  );
}

function gradeColor(grade: Grade) {
  switch (grade) {
    case "A": return "text-success";
    case "B": return "text-success";
    case "C": return "text-warning";
    case "Warning": return "text-danger";
  }
}

function ResultsView({
  asset, direction, riskText, rewardText, rrText, grade, verdict,
  coaching, warnings, moveToStopText, moveToTargetText, sizeText, sizeNote, riskConfirmText, onSave,
}: {
  asset: string; direction: Direction; riskText: string; rewardText: string; rrText: string;
  grade: Grade; verdict: Verdict; coaching: string; warnings: string[];
  moveToStopText: string; moveToTargetText: string; sizeText: string;
  sizeNote: string | null; riskConfirmText: string | null; onSave: () => void;
}) {
  return (
    <div className="space-y-5">
      <VerdictBanner verdict={verdict} />

      {/* Asset summary + grade */}
      <div className="flex items-center justify-between rounded-lg border border-border/60 bg-secondary/30 px-3 py-2.5">
        <div className="min-w-0">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Setup</div>
          <div className="truncate text-sm font-medium">
            {asset ? asset.toUpperCase() : "Unnamed"}{" "}
            <span className={direction === "buy" ? "text-success" : "text-danger"}>· {direction === "buy" ? "Long" : "Short"}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Grade</div>
          <div className={cn("font-mono text-sm font-bold", gradeColor(grade))}>
            {grade} <span className="text-xs font-medium opacity-80">({GRADE_LABEL[grade]})</span>
          </div>
        </div>
      </div>

      {/* Prominent Suggested Size */}
      <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-4 shadow-[0_0_28px_-12px_var(--primary)]">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary/90">
          <Package className="h-3.5 w-3.5" /> Suggested size
        </div>
        <div key={sizeText} className="animate-in fade-in slide-in-from-bottom-1 duration-200 mt-1 font-mono text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {sizeText}
        </div>
        {sizeNote ? (
          <p className="mt-1.5 text-xs text-warning">{sizeNote}</p>
        ) : riskConfirmText ? (
          <p className="mt-1.5 text-xs text-muted-foreground">{riskConfirmText}</p>
        ) : null}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <Stat icon={<AlertTriangle className="h-3.5 w-3.5" />} label="Risk" value={riskText} tone="danger" />
        <Stat icon={<span className="text-sm leading-none">💰</span>} label="Reward" value={rewardText} tone="success" />
        <Stat icon={<Scale className="h-3.5 w-3.5" />} label="R : R" value={rrText} tone="neutral" />
        <Stat label="Move to stop" value={moveToStopText} tone="neutral" />
        <Stat label="Move to target" value={moveToTargetText} tone="neutral" />
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

      {/* Reality check */}
      <div className="rounded-lg border border-border/60 bg-background/40 p-3">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground/80">Before you execute</div>
        <ul className="space-y-1.5 text-xs text-foreground/85">
          {[
            "Does market structure support this trade?",
            "Is DXY / macro context aligned?",
            "Is there high-impact news nearby?",
            "Is this part of your plan or impulsive?",
          ].map((q) => (
            <li key={q} className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary/70" />
              <span>{q}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <ul className="space-y-2">
          {warnings.map((w, i) => (
            <li key={i} className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-2.5 text-xs text-warning">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              <span className="leading-relaxed">{w}</span>
            </li>
          ))}
        </ul>
      )}

      <Button onClick={onSave} className="w-full" variant="secondary">
        <Download className="mr-2 h-4 w-4" /> Save Trade Plan
      </Button>
    </div>
  );
}

function Stat({
  icon, label, value, tone,
}: { icon?: React.ReactNode; label: string; value: string; tone: "success" | "danger" | "neutral" }) {
  const toneClass = tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-foreground";
  return (
    <div className="rounded-md border border-border/60 bg-secondary/30 p-3 transition-colors">
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div key={value} className={cn("animate-in fade-in slide-in-from-bottom-1 duration-200 mt-1 truncate font-mono text-sm font-semibold sm:text-base", toneClass)}>
        {value}
      </div>
    </div>
  );
}

function MiniBar({ risk, rr, size, grade }: { risk: string; rr: string; size: string; grade: Grade }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-card/70 px-3 py-2 backdrop-blur-xl backdrop-saturate-150 shadow-[0_-8px_32px_-12px_rgba(0,0,0,0.5)] lg:inset-x-auto lg:bottom-auto lg:right-4 lg:top-4 lg:rounded-xl lg:border lg:px-4 lg:py-2.5 lg:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 text-[11px] sm:text-xs lg:max-w-none lg:gap-4">
        <MiniItem label="Risk" value={risk} />
        <MiniItem label="R:R" value={rr} />
        <MiniItem label="Size" value={size} />
        <MiniItem label="Grade" value={grade} valueClass={gradeColor(grade)} />
      </div>
    </div>
  );
}

function MiniItem({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex min-w-0 flex-col leading-tight">
      <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={cn("truncate font-mono font-semibold", valueClass)}>{value}</span>
    </div>
  );
}
