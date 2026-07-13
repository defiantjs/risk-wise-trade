import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Info,
  Lock,
  Package,
  RotateCcw,
  Scale,
  TrendingDown,
  TrendingUp,
  Wallet,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SiteNav } from "@/components/site-nav";
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

type AssetType = "forex" | "commodities" | "indices" | "crypto" | "stocks";
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
  { value: "commodities", label: "Metals & Energy", pipValue: "100", unit: "lots", hint: "Gold CFD: 1.00 lot = 100 oz. $1.00 price move at 1 lot = $100. Adjust broker settings if different." },
  { value: "indices", label: "Indices", pipValue: "1", unit: "contracts", hint: "Typical CFD (NAS100, US500, US30…) ≈ $1 per point per contract. Verify with broker." },
  { value: "crypto", label: "Crypto", pipValue: "1", unit: "units", hint: "Spot crypto ≈ $1 per $1 move per 1 unit." },
  { value: "stocks", label: "Stocks / ETFs", pipValue: "1", unit: "shares", hint: "$1 move per share = $1 P&L per share. Applies to ETFs (SPY, QQQ…) too." },
];

// Commodity CFD broker defaults (XAUUSD standard). Editable by the trader.
const COMMODITY_BROKER_DEFAULTS = {
  contractSize: "100", // 1 lot = 100 oz
  pointSize: "0.01",
  minLot: "0.01",
  lotStep: "0.01",
};

// Lightweight symbol sniffing so the sizing math doesn't silently stay on
// Forex defaults when someone types an index, commodity, or stock into the
// free-text Asset / pair field without touching the Asset type dropdown.
const ASSET_TYPE_PATTERNS: { pattern: RegExp; type: AssetType }[] = [
  { pattern: /^(XAU|XAG|GOLD|SILVER|WTI|BRENT|USOIL|UKOIL|XTIUSD|XBRUSD|CL1?)/i, type: "commodities" },
  { pattern: /^(NAS100|US100|USTEC|SPX500|US500|SPX|US30|DJ30|DJI|GER40|DAX40|DAX|UK100|FTSE|JPN225|NIKKEI|HK50|AUS200)/i, type: "indices" },
  { pattern: /^(BTC|ETH|XRP|SOL|DOGE|LTC|ADA|BNB|AVAX|MATIC)/i, type: "crypto" },
  { pattern: /^[A-Z]{3}(USD|EUR|GBP|JPY|CHF|AUD|CAD|NZD)$/i, type: "forex" },
  { pattern: /^[A-Z]{1,5}$/i, type: "stocks" }, // bare tickers, e.g. AAPL, SPY, TSLA
];

function detectAssetType(pair: string): AssetType | null {
  const trimmed = pair.trim();
  if (!trimmed) return null;
  for (const { pattern, type } of ASSET_TYPE_PATTERNS) {
    if (pattern.test(trimmed)) return type;
  }
  return null;
}

export const Route = createFileRoute("/validate")({ component: TradePlanChecker });

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
  // Broker settings (used for commodity CFDs; hidden for other asset types)
  contractSize: COMMODITY_BROKER_DEFAULTS.contractSize,
  pointSize: COMMODITY_BROKER_DEFAULTS.pointSize,
  minLot: COMMODITY_BROKER_DEFAULTS.minLot,
  lotStep: COMMODITY_BROKER_DEFAULTS.lotStep,
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

  // Tracks whether the trader manually picked an Asset type, so auto-detection
  // never fights a deliberate choice — only fills in when they haven't chosen yet.
  const [assetTypeTouched, setAssetTypeTouched] = useState(false);
  const [autoDetected, setAutoDetected] = useState(false);

  const setAssetType = (v: AssetType) => {
    setAssetTypeTouched(true);
    setAutoDetected(false);
    set("assetType", v);
  };

  // Auto-fill pip value + unit when in Quick mode and asset type changes
  useEffect(() => {
    if (s.sizingMode !== "quick") return;
    const a = ASSET_TYPES.find((x) => x.value === s.assetType)!;
    setS((prev) => ({ ...prev, pipValue: a.pipValue, unitLabel: a.unit }));
  }, [s.assetType, s.sizingMode]);

  // Detect asset type from what's typed in Asset / pair (e.g. "WTI", "NAS100",
  // "AAPL") so the sizing math doesn't stay silently pinned to Forex defaults.
  // Only runs until the trader manually overrides the dropdown; clearing the
  // pair field re-arms auto-detection.
  useEffect(() => {
    if (!s.asset.trim()) {
      setAssetTypeTouched(false);
      setAutoDetected(false);
      return;
    }
    if (assetTypeTouched) return;
    const detected = detectAssetType(s.asset);
    if (detected && detected !== s.assetType) {
      setS((prev) => ({ ...prev, assetType: detected }));
      setAutoDetected(true);
    }
  }, [s.asset]);

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
    const rawSize =
      pipValue !== null && pipValue > 0 && stopDist > 0 && dollarRisk !== null
        ? safe(dollarRisk / (stopDist * pipValue))
        : null;
    // For commodity CFDs, snap DOWN to the broker's lot step so realized
    // risk never exceeds the selected %. Below minLot → not tradeable.
    const lotStepN = num(s.lotStep);
    const minLotN = num(s.minLot);
    let suggestedSize = rawSize;
    if (s.assetType === "commodities" && rawSize !== null && lotStepN && lotStepN > 0) {
      const snapped = Math.floor(rawSize / lotStepN) * lotStepN;
      const min = minLotN && minLotN > 0 ? minLotN : 0;
      suggestedSize = snapped >= min ? Math.round(snapped * 1e6) / 1e6 : 0;
    }

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
      riskPct: riskPct!,
      directionMismatch,
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
      forex: 2, commodities: 2, indices: 2, crypto: 4, stocks: 2,
    };
    const decimals = decimalsByAsset[s.assetType] ?? 2;
    return `${size.toLocaleString(undefined, {
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals,
    })} ${label}`;
  };

  const suggestedSizeVal =
    "suggestedSize" in result ? result.suggestedSize : null;
  const dollarRiskVal =
    "dollarRisk" in result ? result.dollarRisk : null;

  const sizeText =
    suggestedSizeVal !== null && Number.isFinite(suggestedSizeVal)
      ? formatSize(suggestedSizeVal)
      : "—";

  const dash = "—";
  const moneyOrDash = (n: number | null) => (n === null ? dash : fmtMoney(n));
  const rrText = result.ready && result.rr !== null ? `${result.rr.toFixed(2)} : 1` : dash;

  // Pip / point distance — derived from asset type and pair name.
  // Commodities use the broker's editable point size (default 0.01 for XAUUSD).
  const brokerPointN = num(s.pointSize);
  const pipSize = (() => {
    if (s.assetType === "forex") return /JPY/i.test(s.asset) ? 0.01 : 0.0001;
    if (s.assetType === "commodities") return brokerPointN && brokerPointN > 0 ? brokerPointN : 0.01;
    if (s.assetType === "stocks") return 0.01;
    return 1; // indices, crypto
  })();
  const distanceUnit = s.assetType === "forex" ? "pips" : "pts";

  const entryN = num(s.entry);
  const stopN = num(s.stop);
  const tpN = num(s.tp);
  const pipN = num(s.pipValue);
  const balanceN = num(s.balance);
  const riskPctN = num(s.riskPct);

  const stopDistRaw = entryN !== null && stopN !== null ? Math.abs(entryN - stopN) : null;
  const targetDistRaw = entryN !== null && tpN !== null ? Math.abs(tpN - entryN) : null;
  const stopPips = stopDistRaw !== null ? stopDistRaw / pipSize : null;
  const targetPips = targetDistRaw !== null ? targetDistRaw / pipSize : null;
  const fmtPips = (n: number) =>
    Math.abs(n) >= 10000
      ? n.toLocaleString(undefined, { notation: "compact", maximumFractionDigits: 1 })
      : n.toLocaleString(undefined, { maximumFractionDigits: s.assetType === "forex" ? 1 : 2 });

  const moveStopText =
    result.ready && result.moveToStopPct !== null && stopPips !== null
      ? `${result.moveToStopPct.toFixed(2)}% · ${fmtPips(stopPips)} ${distanceUnit}`
      : dash;
  const moveTargetText =
    result.ready && result.moveToTargetPct !== null && targetPips !== null
      ? `${result.moveToTargetPct.toFixed(2)}% · ${fmtPips(targetPips)} ${distanceUnit}`
      : dash;
  const riskText = dollarRiskVal !== null ? moneyOrDash(dollarRiskVal) : dash;
  const rewardText = result.ready ? moneyOrDash(result.reward) : dash;

  // Commodity CFD "Position Breakdown" — underlying quantity and per-move P&L.
  const contractSizeN = num(s.contractSize);
  const isCommodity = s.assetType === "commodities";
  const commodityLabel = /XAU|GOLD/i.test(s.asset) ? "Gold" : /XAG|SILVER/i.test(s.asset) ? "Silver" : /WTI|BRENT|OIL/i.test(s.asset) ? "Oil" : "";
  const commodityUnit = /XAU|XAG|GOLD|SILVER/i.test(s.asset) || !s.asset.trim() ? "oz" : "units";
  const breakdown =
    isCommodity && suggestedSizeVal !== null && suggestedSizeVal > 0 && contractSizeN && contractSizeN > 0 && brokerPointN && brokerPointN > 0
      ? {
          size: suggestedSizeVal,
          underlyingQty: suggestedSizeVal * contractSizeN,
          unit: commodityUnit,
          label: commodityLabel,
          perPointMove: suggestedSizeVal * contractSizeN * brokerPointN, // $ per 1 point (e.g. $0.01)
          perUnitMove: suggestedSizeVal * contractSizeN,                  // $ per $1.00
          pointSize: brokerPointN,
        }
      : null;

  // "How size was calculated" trace (commodities only, when all inputs present).
  const howCalculated =
    isCommodity && balanceN !== null && riskPctN !== null && dollarRiskVal !== null && stopDistRaw !== null && contractSizeN && contractSizeN > 0
      ? {
          balance: balanceN,
          riskPct: riskPctN,
          dollarRisk: dollarRiskVal,
          stopDist: stopDistRaw,
          contractSize: contractSizeN,
          riskPerLot: stopDistRaw * contractSizeN,
          size: suggestedSizeVal ?? 0,
          unit: commodityUnit,
        }
      : null;

  // Distance in $ and points (commodities).
  const stopDistanceText =
    isCommodity && stopDistRaw !== null && stopPips !== null
      ? `$${stopDistRaw.toFixed(2)} · ${fmtPips(stopPips)} pts`
      : null;
  const targetDistanceText =
    isCommodity && targetDistRaw !== null && targetPips !== null
      ? `$${targetDistRaw.toFixed(2)} · ${fmtPips(targetPips)} pts`
      : null;

  // Per-field validation for sizing
  const checks: { label: string; ok: boolean; msg?: string }[] = [
    {
      label: "Account balance",
      ok: balanceN !== null && balanceN > 0,
      msg: balanceN === null ? "Required" : balanceN <= 0 ? "Must be greater than 0" : undefined,
    },
    {
      label: "Risk %",
      ok: riskPctN !== null && riskPctN > 0 && riskPctN <= 100,
      msg: riskPctN === null ? "Required" : riskPctN <= 0 ? "Must be greater than 0" : riskPctN > 100 ? "Max 100%" : undefined,
    },
    {
      label: "Entry price",
      ok: entryN !== null && entryN > 0,
      msg: entryN === null ? "Required" : "Must be greater than 0",
    },
    {
      label: "Stop loss",
      ok: stopN !== null && stopN > 0 && entryN !== null && Math.abs(entryN - stopN) > 0,
      msg:
        stopN === null
          ? "Required"
          : stopN <= 0
            ? "Must be greater than 0"
            : entryN !== null && stopN === entryN
              ? "Cannot equal entry"
              : undefined,
    },
    {
      label: s.sizingMode === "advanced" ? "Pip / point value" : "Pip value",
      ok: pipN !== null && pipN > 0,
      msg: pipN === null ? "Required" : "Must be greater than 0",
    },
  ];
  const failingChecks = checks.filter((c) => !c.ok);
  const sizeNote =
    failingChecks.length > 0
      ? `${failingChecks.length} input${failingChecks.length === 1 ? "" : "s"} need attention`
      : null;

  const riskConfirmText =
    suggestedSizeVal !== null && dollarRiskVal !== null
      ? `At this size, max account risk = ${num(s.riskPct)}% / ${fmtMoney(dollarRiskVal)}`
      : null;

  const [isGenerating, setIsGenerating] = useState(false);
  const [manualSaveUrl, setManualSaveUrl] = useState<string | null>(null);

  const handleSave = (executionScore: number) => {
    if (!result.ready) return;
    // Brief on-screen celebration before the PNG generates — makes the export
    // feel like minting a card, not silently saving a screenshot.
    setIsGenerating(true);
    setTimeout(async () => {
      try {
        // Enrich move-to-stop / move-to-target with the $ impact so the card
        // matches the "0.05% · 200 pts · $10.00" format from the mockup.
        const cardMoveStop =
          result.dollarRisk !== null && moveStopText !== dash
            ? `${moveStopText} · ${fmtMoney(result.dollarRisk)}`
            : moveStopText;
        const cardMoveTarget =
          result.reward !== null && moveTargetText !== dash
            ? `${moveTargetText} · ${fmtMoney(result.reward)}`
            : moveTargetText;

        // "How size is calculated" one-liner (commodities only) mirrors the
        // in-app expandable trace so the shared card is self-explanatory.
        const howCalcText =
          howCalculated && stopPips !== null && suggestedSizeVal !== null && brokerPointN
            ? `${fmtMoney(howCalculated.balance)} balance × ${howCalculated.riskPct}% risk = ${fmtMoney(
                howCalculated.dollarRisk
              )} max risk. Stop distance (${fmtPips(stopPips)} pts) × ${fmtMoney(
                suggestedSizeVal * howCalculated.contractSize * brokerPointN
              )} per pt (${suggestedSizeVal.toFixed(2)} lot) = ${fmtMoney(howCalculated.dollarRisk)} risk.`
            : null;


        const riskSubText =
          balanceN !== null && riskPctN !== null
            ? `(${riskPctN}% of ${fmtMoney(balanceN)})`
            : null;

        const validSubText =
          result.verdict === "valid"
            ? "Trend aligned · Risk managed · Execution approved"
            : result.verdict === "adjust"
              ? "Reduce size or improve R:R before entry"
              : "Setup does not meet execution criteria";

        const blob = await renderTradeCardBlob({
          asset: s.asset || "UNNAMED",
          direction: s.direction,
          grade: result.grade,
          verdict: result.verdict,
          executionScore,
          entry: s.entry,
          stop: s.stop,
          tp: s.tp,
          balanceText: fmtMoney(balanceN!),
          riskPctText: `${s.riskPct}%`,
          riskText,
          riskSubText,
          rewardText,
          rrText,
          sizeText,
          moveStopText: cardMoveStop,
          moveTargetText: cardMoveTarget,
          howCalcText,
          validSubText,
        });
        const filename = `pipgrade-${(s.asset || "setup").toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.png`;
        await saveOrShareTradeCard(blob, filename, setManualSaveUrl);
      } catch (err) {
        console.error("Trade card generation failed:", err);
      } finally {
        setIsGenerating(false);
      }
    }, 550);
  };


  // Growth Planner handoff — carry this validated trade's numbers over as a
  // starting point rather than making the trader retype them. Plain query
  // params (read client-side on the Growth Planner) so this doesn't depend
  // on a typed search schema that isn't defined for that route.
  const growthHref =
    result.ready && balanceN !== null
      ? `/growth?balance=${encodeURIComponent(String(balanceN))}&risk=${encodeURIComponent(s.riskPct)}${
          result.rr !== null ? `&rr=${encodeURIComponent(result.rr.toFixed(2))}` : ""
        }`
      : "/growth";

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

      <SiteNav />
      <div className="mx-auto max-w-6xl px-4 pb-28 pt-2 sm:px-6 lg:pb-14">
        <header className="mb-8">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Describe Trade</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Describe the setup. PipGrade evaluates it live and returns an Execution Report before you risk capital.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Inputs */}
          <Card className="glass border-border/50 shadow-xl shadow-black/20 lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Describe Trade</CardTitle>
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
                    <Select value={s.assetType} onValueChange={(v) => setAssetType(v as AssetType)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ASSET_TYPES.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {autoDetected && (
                      <p className="mt-1 text-[10px] text-primary">
                        Auto-detected from &ldquo;{s.asset.trim()}&rdquo; — change if wrong.
                      </p>
                    )}
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
                {s.assetType === "commodities" && (
                  <div className="mt-4 rounded-md border border-border/40 bg-background/40 p-3">
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-foreground/70">
                      Broker settings (XAUUSD CFD)
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Contract size" hint="per 1 lot">
                        <Input value={s.contractSize} onChange={(e) => set("contractSize", e.target.value)} inputMode="decimal" className="font-mono" />
                      </Field>
                      <Field label="Point size">
                        <Input value={s.pointSize} onChange={(e) => set("pointSize", e.target.value)} inputMode="decimal" className="font-mono" />
                      </Field>
                      <Field label="Minimum lot">
                        <Input value={s.minLot} onChange={(e) => set("minLot", e.target.value)} inputMode="decimal" className="font-mono" />
                      </Field>
                      <Field label="Lot step">
                        <Input value={s.lotStep} onChange={(e) => set("lotStep", e.target.value)} inputMode="decimal" className="font-mono" />
                      </Field>
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                      Size is rounded down to the nearest lot step so realized risk never exceeds your selected %.
                    </p>
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
            <Card className="glass border-primary/25 shadow-2xl shadow-primary/10 ring-1 ring-primary/20 lg:sticky lg:top-20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">Execution Report</CardTitle>
                  {result.ready && (
                    <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_8px_var(--success)] animate-pulse" />
                      Live
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {result.ready ? (
                  <ResultsView
                    asset={s.asset}
                    assetType={s.assetType}
                    direction={s.direction}
                    riskText={riskText}
                    rewardText={rewardText}
                    rrText={rrText}
                    riskPct={result.riskPct}
                    rr={result.rr}
                    directionMismatch={result.directionMismatch}
                    grade={result.grade}
                    verdict={result.verdict}
                    coaching={result.coaching}
                    warnings={result.warnings}
                    moveToStopText={moveStopText}
                    moveToTargetText={moveTargetText}
                    sizeText={sizeText}
                    sizeNote={sizeNote}
                    riskConfirmText={riskConfirmText}
                    growthHref={growthHref}
                    isGenerating={isGenerating}
                    onSave={handleSave}
                    breakdown={breakdown}
                    howCalculated={howCalculated}
                    stopDistanceText={stopDistanceText}
                    targetDistanceText={targetDistanceText}
                  />
                ) : result.sizingReady ? (
                  <PartialResults sizeText={sizeText} sizeNote={sizeNote} riskConfirmText={riskConfirmText} checks={checks} />
                ) : (
                  <EmptyResults sizeNote={sizeNote} checks={checks} />
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <p className="mt-10 text-center text-xs leading-relaxed text-muted-foreground">
          This tool is for educational purposes only and does not provide financial advice.
        </p>
      </div>

      {manualSaveUrl && (
        <ManualSaveOverlay
          url={manualSaveUrl}
          onClose={() => {
            URL.revokeObjectURL(manualSaveUrl);
            setManualSaveUrl(null);
          }}
        />
      )}
    </div>
  );
}

/* ---------- Subcomponents ---------- */

// Shown when neither the Web Share API nor the download attribute is
// available (older iOS Safari, some in-app WebViews) -- long-pressing the
// image is a baseline capability on essentially every mobile browser.
function ManualSaveOverlay({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/90 p-6 backdrop-blur-sm">
      <p className="text-center text-sm font-medium text-white">
        Press and hold the image, then choose <span className="text-primary">Save to Photos</span>.
      </p>
      <img
        src={url}
        alt="PipGrade trade card"
        className="max-h-[70vh] w-auto rounded-xl border border-white/10 shadow-2xl"
      />
      <Button variant="outline" onClick={onClose} className="mt-2">
        Done
      </Button>
    </div>
  );
}

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

type Check = { label: string; ok: boolean; msg?: string };

function ValidationChecklist({ checks }: { checks: Check[] }) {
  return (
    <div className="rounded-lg border border-border/60 bg-secondary/30 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-foreground/70">Sizing inputs</div>
        <div className="text-[10px] text-muted-foreground">
          {checks.filter((c) => c.ok).length}/{checks.length} ready
        </div>
      </div>
      <ul className="space-y-1.5">
        {checks.map((c) => (
          <li key={c.label} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-2">
              {c.ok ? (
                <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-success" />
              ) : (
                <XCircle className="h-3.5 w-3.5 flex-shrink-0 text-danger" />
              )}
              <span className={c.ok ? "text-foreground/80" : "text-foreground"}>{c.label}</span>
            </span>
            {!c.ok && c.msg && <span className="text-[10px] text-danger">{c.msg}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyResults({ sizeNote, checks }: { sizeNote: string | null; checks: Check[] }) {
  return (
    <div className="space-y-4 py-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/25 to-pink/15 ring-1 ring-primary/30">
          <ClipboardCheck className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Describe Your Trade</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Enter your trade parameters to generate an execution report.
          </p>
        </div>
      </div>
      <ValidationChecklist checks={checks} />
      <p className="text-center text-[11px] text-muted-foreground/70">
        {sizeNote ?? "Add a take profit to grade the full setup."}
      </p>
    </div>
  );
}

function PartialResults({
  sizeText, sizeNote, riskConfirmText, checks,
}: { sizeText: string; sizeNote: string | null; riskConfirmText: string | null; checks: Check[] }) {
  return (
    <div className="space-y-4">
      <ValidationChecklist checks={checks} />
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
      <div className="rounded-lg border border-border/60 bg-secondary/30 p-3 text-xs text-muted-foreground">
        <Info className="mr-1.5 inline h-3.5 w-3.5 align-[-2px] text-muted-foreground" />
        Add a take profit to see R:R, reward, verdict, and grade.
      </div>
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

/* ---------- Execution Score ----------
 * Weighted composite so "how good is this trade" is one number, not five
 * scattered ones. Weights are named and separated out so a future scoring
 * input (e.g. System Alignment data, once that's real) can be added without
 * restructuring this.
 */
const SCORE_WEIGHTS = { risk: 0.3, reward: 0.3, sizing: 0.2, confirmation: 0.2 } as const;

type TriState = "confirmed" | "review" | "concern";

const CONFIRMATION_ITEMS = [
  "Market structure supports trade",
  "High timeframe trend aligned",
  "High-impact news checked",
  "Trade follows my written plan",
  "Position size confirmed",
];

const TRI_CONFIG: Record<TriState, { label: string; dot: string; glow: string; icon: React.ReactNode }> = {
  confirmed: { label: "Confirmed", dot: "bg-success", glow: "shadow-[0_0_10px_-2px_var(--success)]", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  review: { label: "Needs Review", dot: "bg-warning", glow: "shadow-[0_0_10px_-2px_var(--warning)]", icon: <Info className="h-3.5 w-3.5" /> },
  concern: { label: "Concern", dot: "bg-danger", glow: "shadow-[0_0_10px_-2px_var(--danger)]", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
};

function computeExecutionScore({
  riskPct, rr, directionMismatch, confirmationState,
}: { riskPct: number; rr: number | null; directionMismatch: boolean; confirmationState: TriState[] }) {
  const clamp = (n: number) => Math.max(0, Math.min(100, n));

  let riskScore: number;
  if (riskPct <= 1) riskScore = 100;
  else if (riskPct <= 2) riskScore = 100 - (riskPct - 1) * 40;
  else if (riskPct <= 4) riskScore = 60 - (riskPct - 2) * 30;
  else riskScore = 0;

  const r = rr ?? 0;
  let rewardScore: number;
  if (r >= 3) rewardScore = 100;
  else if (r >= 2) rewardScore = 80 + (r - 2) * 20;
  else if (r >= 1.5) rewardScore = 50 + (r - 1.5) * 60;
  else rewardScore = (r / 1.5) * 50;

  const sizingScore = directionMismatch ? 40 : 100;

  const triValue = (t: TriState) => (t === "confirmed" ? 100 : t === "review" ? 50 : 0);
  const confirmationScore =
    confirmationState.length > 0
      ? confirmationState.reduce((sum, t) => sum + triValue(t), 0) / confirmationState.length
      : 50;

  const total =
    clamp(riskScore) * SCORE_WEIGHTS.risk +
    clamp(rewardScore) * SCORE_WEIGHTS.reward +
    clamp(sizingScore) * SCORE_WEIGHTS.sizing +
    clamp(confirmationScore) * SCORE_WEIGHTS.confirmation;

  return Math.round(clamp(total));
}

function useCountUp(target: number, duration = 600) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function ScoreAndGrade({ score, grade }: { score: number; grade: Grade }) {
  const animated = useCountUp(score);
  const scoreColor = score >= 80 ? "text-success" : score >= 60 ? "text-warning" : "text-danger";
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/60 bg-secondary/30 px-4 py-3.5">
      <div>
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Execution Score</div>
        <div className={cn("font-mono text-3xl font-extrabold tracking-tight sm:text-4xl", scoreColor)}>
          {animated}
          <span className="text-base font-medium text-muted-foreground">/100</span>
        </div>
      </div>
      <div className="text-right">
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Grade</div>
        <div className={cn("font-mono text-lg font-bold", gradeColor(grade))}>
          {grade} <span className="text-xs font-medium opacity-80">({GRADE_LABEL[grade]})</span>
        </div>
      </div>
    </div>
  );
}

function tradeReasons({
  riskPct, rr, directionMismatch, verdict,
}: { riskPct: number; rr: number | null; directionMismatch: boolean; verdict: Verdict }): { ok: boolean; text: string }[] {
  const r = rr ?? 0;
  return [
    { ok: riskPct <= 2, text: riskPct <= 2 ? "Risk within plan" : "Risk exceeds plan" },
    { ok: r >= 2, text: r >= 2 ? "Reward exceeds minimum 2R" : "Reward below minimum 2R" },
    { ok: verdict !== "no", text: verdict !== "no" ? "Position sizing matches account risk" : "Position sizing too aggressive for this setup" },
    { ok: !directionMismatch, text: !directionMismatch ? "Direction is valid" : "Direction mismatch" },
  ];
}

function WhyThisTrade({ verdict, reasons }: { verdict: Verdict; reasons: { ok: boolean; text: string }[] }) {
  const passed = verdict !== "no";
  return (
    <div className={cn("rounded-lg border p-3", passed ? "border-success/30 bg-success/5" : "border-danger/30 bg-danger/5")}>
      <div className={cn("mb-2 text-xs font-semibold uppercase tracking-wider", passed ? "text-success" : "text-danger")}>
        {passed ? "Why This Trade Passed" : "Why This Trade Was Flagged"}
      </div>
      <ul className="space-y-1.5">
        {reasons.map((r) => (
          <li key={r.text} className="flex items-center gap-2 text-xs">
            {r.ok ? (
              <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-success" />
            ) : (
              <XCircle className="h-3.5 w-3.5 flex-shrink-0 text-danger" />
            )}
            <span className={r.ok ? "text-foreground/85" : "text-danger/90"}>{r.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ExecutionConfirmation({
  state, onChange,
}: { state: TriState[]; onChange: (i: number, v: TriState) => void }) {
  const confirmedCount = state.filter((v) => v === "confirmed").length;
  const pct = Math.round((confirmedCount / state.length) * 100);
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Execution Confirmation</div>
        <div className="text-[10px] font-semibold text-primary">Execution Readiness: {pct}%</div>
      </div>
      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary/50">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-pink transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <ul className="space-y-2">
        {CONFIRMATION_ITEMS.map((text, i) => (
          <li key={text} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-xs">
            <span className="text-foreground/85">{text}</span>
            <div className="flex flex-shrink-0 items-center gap-1.5">
              {(Object.keys(TRI_CONFIG) as TriState[]).map((tri) => (
                <button
                  key={tri}
                  type="button"
                  title={TRI_CONFIG[tri].label}
                  aria-pressed={state[i] === tri}
                  onClick={() => onChange(i, tri)}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border transition-all duration-200",
                    state[i] === tri
                      ? cn("scale-110 border-transparent text-white", TRI_CONFIG[tri].dot, TRI_CONFIG[tri].glow)
                      : "border-border/50 bg-secondary/30 text-muted-foreground/40 hover:text-muted-foreground"
                  )}
                >
                  {TRI_CONFIG[tri].icon}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

const LOCKED_CONTEXT = ["Live Economic Calendar", "DXY Bias", "Volatility", "Session Context"];

function newsHrefFor(assetType: AssetType, asset: string): string | undefined {
  if (assetType === "crypto") return undefined;
  if (assetType === "stocks" && asset.trim()) {
    return `https://finance.yahoo.com/quote/${encodeURIComponent(asset.trim().toUpperCase())}`;
  }
  return "https://www.forexfactory.com/calendar";
}

function MarketContext({ newsHref }: { newsHref?: string }) {
  const free: { label: string; href?: string }[] = [
    { label: "Structure" },
    { label: "News", href: newsHref },
    { label: "Trading Plan" },
  ];
  return (
    <div className="rounded-lg border border-border/60 bg-secondary/20 p-3">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground/80">Market Context</div>
      <div className="grid grid-cols-3 gap-2">
        {free.map((item) =>
          item.href ? (
            <a
              key={item.label}
              href={item.href}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-border/50 bg-background/40 p-2.5 text-center transition-colors hover:border-primary/40"
            >
              <CheckCircle2 className="mx-auto h-3.5 w-3.5 text-success" />
              <div className="mt-1 text-[10px] font-medium text-foreground/80">{item.label} &#8599;</div>
            </a>
          ) : (
            <div key={item.label} className="rounded-md border border-border/50 bg-background/40 p-2.5 text-center">
              <CheckCircle2 className="mx-auto h-3.5 w-3.5 text-success" />
              <div className="mt-1 text-[10px] font-medium text-foreground/80">{item.label}</div>
            </div>
          )
        )}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {LOCKED_CONTEXT.map((label) => (
          <div key={label} className="rounded-md border border-dashed border-border/50 bg-background/20 p-2.5 text-center opacity-60">
            <Lock className="mx-auto h-3.5 w-3.5 text-muted-foreground" />
            <div className="mt-1 text-[10px] font-medium text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-[10px] text-muted-foreground/70">Locked cards available in PipGrade Pro</p>
    </div>
  );
}

type Breakdown = {
  size: number;
  underlyingQty: number;
  unit: string;
  label: string;
  perPointMove: number;
  perUnitMove: number;
  pointSize: number;
} | null;

type HowCalculated = {
  balance: number;
  riskPct: number;
  dollarRisk: number;
  stopDist: number;
  contractSize: number;
  riskPerLot: number;
  size: number;
  unit: string;
} | null;

function fmtLot(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtQty(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function PositionBreakdown({ b }: { b: NonNullable<Breakdown> }) {
  const pointLabel = b.pointSize === 0.01 ? "$0.01" : `$${b.pointSize}`;
  return (
    <div className="rounded-xl border border-border/60 bg-secondary/20 p-4">
      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/70">
        <Package className="h-3.5 w-3.5" /> Position Breakdown
      </div>
      <div className="space-y-1 font-mono text-sm text-foreground/90">
        <div className="text-lg font-bold tracking-tight text-foreground">{fmtLot(b.size)} lots</div>
        <div className="text-foreground/80">{fmtQty(b.underlyingQty)} {b.unit}{b.label ? ` ${b.label}` : ""}</div>
        <div className="text-muted-foreground">${b.perPointMove.toFixed(2)} per {pointLabel} move</div>
        <div className="text-muted-foreground">${b.perUnitMove.toFixed(2)} per $1.00 move</div>
      </div>
    </div>
  );
}

function HowSizeCalculated({ h }: { h: NonNullable<HowCalculated> }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-border/50 bg-background/30">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-foreground/75 hover:text-foreground"
      >
        <span className="flex items-center gap-1.5"><Info className="h-3.5 w-3.5" /> How size was calculated</span>
        <span className="text-muted-foreground">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="border-t border-border/50 px-3 py-2.5 font-mono text-xs leading-relaxed text-foreground/85">
          <div>{fmtMoney(h.balance)} × {h.riskPct}% = {fmtMoney(h.dollarRisk)} risk</div>
          <div>${h.stopDist.toFixed(2)} stop × {fmtQty(h.contractSize)} {h.unit} = {fmtMoney(h.riskPerLot)} risk per 1 lot</div>
          <div>{fmtMoney(h.dollarRisk)} ÷ {fmtMoney(h.riskPerLot)} = {fmtLot(h.size)} lots</div>
        </div>
      )}
    </div>
  );
}

function ResultsView({
  asset, assetType, direction, riskText, rewardText, rrText,
  riskPct, rr, directionMismatch,
  grade, verdict, coaching, warnings, moveToStopText, moveToTargetText,
  sizeText, sizeNote, riskConfirmText, growthHref, isGenerating, onSave,
  breakdown, howCalculated, stopDistanceText, targetDistanceText,
}: {
  asset: string; assetType: AssetType; direction: Direction; riskText: string; rewardText: string; rrText: string;
  riskPct: number; rr: number | null; directionMismatch: boolean;
  grade: Grade; verdict: Verdict; coaching: string; warnings: string[];
  moveToStopText: string; moveToTargetText: string; sizeText: string;
  sizeNote: string | null; riskConfirmText: string | null; growthHref: string; isGenerating: boolean;
  onSave: (executionScore: number) => void;
  breakdown: Breakdown; howCalculated: HowCalculated;
  stopDistanceText: string | null; targetDistanceText: string | null;
}) {
  const [confirmationState, setConfirmationState] = useState<TriState[]>(() =>
    CONFIRMATION_ITEMS.map(() => "review")
  );
  const setConfirmation = (i: number, v: TriState) =>
    setConfirmationState((prev) => prev.map((c, idx) => (idx === i ? v : c)));

  const score = computeExecutionScore({ riskPct, rr, directionMismatch, confirmationState });
  const reasons = tradeReasons({ riskPct, rr, directionMismatch, verdict });
  const newsHref = newsHrefFor(assetType, asset);

  return (
    <div className="space-y-6">
      {/* 1. Execution Verdict — dominant */}
      <VerdictBanner verdict={verdict} />

      <div className="flex items-center justify-between px-0.5 text-sm">
        <span className="truncate font-medium">
          {asset ? asset.toUpperCase() : "Unnamed"}{" "}
          <span className={direction === "buy" ? "text-success" : "text-danger"}>
            &middot; {direction === "buy" ? "Long" : "Short"}
          </span>
        </span>
      </div>

      <ScoreAndGrade score={score} grade={grade} />

      {/* 2. Recommended Position Size */}
      <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-4 shadow-[0_0_28px_-12px_var(--primary)]">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary/90">
          <Package className="h-3.5 w-3.5" /> Recommended Position Size
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

      {breakdown && <PositionBreakdown b={breakdown} />}
      {howCalculated && <HowSizeCalculated h={howCalculated} />}

      {/* 3. Risk / Reward / R:R */}
      <div className="grid grid-cols-3 gap-2">
        <Stat icon={<AlertTriangle className="h-3.5 w-3.5" />} label="Risk" value={riskText} tone="danger" />
        <Stat icon={<span className="text-sm leading-none">💰</span>} label="Reward" value={rewardText} tone="success" />
        <Stat icon={<Scale className="h-3.5 w-3.5" />} label="R : R" value={rrText} tone="neutral" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Stat label={stopDistanceText ? "Stop distance" : "Move to stop"} value={stopDistanceText ?? moveToStopText} tone="neutral" />
        <Stat label={targetDistanceText ? "Target distance" : "Move to target"} value={targetDistanceText ?? moveToTargetText} tone="neutral" />
      </div>

      <WhyThisTrade verdict={verdict} reasons={reasons} />

      {/* 4. Coaching */}
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

      {/* 5. Execution Confirmation */}
      <ExecutionConfirmation state={confirmationState} onChange={setConfirmation} />

      <MarketContext newsHref={newsHref} />

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

      {/* 6. Generate Trade Card */}
      <Button
        onClick={() => onSave(score)}
        disabled={isGenerating}
        variant="secondary"
        className={cn(
          "w-full transition-all duration-200 hover:scale-[1.01] hover:shadow-[0_0_24px_-6px_var(--primary)]",
          isGenerating && "animate-pulse"
        )}
      >
        <Download className="mr-2 h-4 w-4" />
        {isGenerating ? "Generating card..." : "Generate Trade Card"}
      </Button>

      {/* 7. Continue to Growth Planner */}
      <a
        href={growthHref}
        className="flex items-center justify-between rounded-lg border border-primary/25 bg-primary/5 px-3.5 py-2.5 text-xs text-foreground/85 transition-colors hover:bg-primary/10"
      >
        <span>Build My Growth Plan</span>
        <span className="font-semibold text-primary">Continue &rarr;</span>
      </a>
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

/* ---------- Trade Card Image Export ---------- */

type TradeCardData = {
  asset: string;
  direction: Direction;
  grade: Grade;
  verdict: Verdict;
  executionScore: number;
  entry: string;
  stop: string;
  tp: string;
  balanceText: string;
  riskPctText: string;
  riskText: string;
  riskSubText: string | null;
  rewardText: string;
  rrText: string;
  sizeText: string;
  moveStopText: string;
  moveTargetText: string;
  howCalcText: string | null;
  validSubText: string;
};


const GRADE_THEME: Record<Grade, { primary: string; secondary: string; glow: string; ring: string; tier: string }> = {
  A: { primary: "#f5d38b", secondary: "#c4b5fd", glow: "rgba(245,211,139,0.38)", ring: "rgba(245,211,139,0.9)", tier: "ELITE" },
  B: { primary: "#c4b5fd", secondary: "#34d399", glow: "rgba(168,85,247,0.34)", ring: "rgba(196,181,253,0.9)", tier: "VALID" },
  C: { primary: "#fbbf6d", secondary: "#f59e0b", glow: "rgba(251,191,109,0.28)", ring: "rgba(251,191,109,0.85)", tier: "MARGINAL" },
  Warning: { primary: "#ef4444", secondary: "#7f1d1d", glow: "rgba(239,68,68,0.22)", ring: "rgba(239,68,68,0.75)", tier: "REJECTED" },
};

function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return h;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(/\s+/);
  let line = "";
  let cy = y;
  for (const word of words) {
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cy);
      line = word;
      cy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, cy);
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string, alpha: number) {

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const angle = (Math.PI / 2) * i;
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r * 0.28);
    ctx.lineTo(cx + Math.cos(angle + Math.PI / 4) * r * 0.35, cy + Math.sin(angle + Math.PI / 4) * r * 0.35);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function renderTradeCardBlob(d: TradeCardData): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    reject(new Error("Canvas 2D context unavailable"));
    return;
  }

  const theme = GRADE_THEME[d.grade];
  const celebratory = d.verdict !== "no";

  // Background
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#120c1a");
  bg.addColorStop(1, "#161022");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Ambient glow tinted to the grade
  const glow = ctx.createRadialGradient(W / 2, 220, 50, W / 2, 220, 760);
  glow.addColorStop(0, theme.glow);
  glow.addColorStop(1, "rgba(168,85,247,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Celebratory sparkle field for anything other than a flagged card
  if (celebratory) {
    const sparkles = [
      [140, 140, 10, theme.primary, 0.55], [940, 120, 8, theme.secondary, 0.5],
      [90, 420, 6, theme.secondary, 0.4], [990, 460, 9, theme.primary, 0.45],
      [180, 980, 7, theme.primary, 0.35], [900, 1020, 6, theme.secondary, 0.35],
      [60, 700, 5, theme.secondary, 0.3], [1010, 760, 7, theme.primary, 0.35],
    ] as const;
    sparkles.forEach(([x, y, r, c, a]) => drawStar(ctx, x, y, r, c, a));
  }

  // Outer foil border — thicker, gradient-stroked, keyed to grade
  const pad = 56;
  roundRect(ctx, pad, pad, W - pad * 2, H - pad * 2, 34);
  const foil = ctx.createLinearGradient(pad, pad, W - pad, H - pad);
  foil.addColorStop(0, theme.primary);
  foil.addColorStop(0.5, "rgba(255,255,255,0.25)");
  foil.addColorStop(1, theme.secondary);
  ctx.save();
  ctx.strokeStyle = foil;
  ctx.lineWidth = 5;
  ctx.shadowColor = theme.glow;
  ctx.shadowBlur = 30;
  ctx.stroke();
  ctx.restore();

  // Card fill, inset from the foil border
  const inner = pad + 8;
  roundRect(ctx, inner, inner, W - inner * 2, H - inner * 2, 28);
  ctx.fillStyle = "rgba(15,12,22,0.78)";
  ctx.fill();

  // Header — monogram + wordmark
  const hx = inner + 34;
  const hy = inner + 34;
  roundRect(ctx, hx, hy, 44, 44, 12);
  const monoGrad = ctx.createLinearGradient(hx, hy, hx + 44, hy + 44);
  monoGrad.addColorStop(0, "rgba(168,85,247,0.35)");
  monoGrad.addColorStop(1, "rgba(236,72,153,0.2)");
  ctx.fillStyle = monoGrad;
  ctx.fill();
  ctx.strokeStyle = "rgba(196,181,253,0.6)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = "#e9d5ff";
  ctx.font = "800 20px ui-sans-serif, system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("PG", hx + 22, hy + 23);
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  ctx.fillStyle = "#ffffff";
  ctx.font = "800 26px ui-sans-serif, system-ui";
  ctx.fillText("PIPGRADE", hx + 58, hy + 1);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "600 14px ui-sans-serif, system-ui";
  ctx.fillText("VERIFIED EXECUTION CARD", hx + 58, hy + 26);

  // Date + serial, top right
  const serialSeed = `${d.asset}-${d.entry}-${d.stop}-${d.tp}-${Date.now()}`;
  const serial = `PG-${Math.abs(hashCode(serialSeed)).toString(36).toUpperCase().slice(0, 6).padStart(6, "0")}`;
  const date = new Date().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = "500 14px ui-sans-serif, system-ui";
  ctx.fillText(date, W - inner - 34, hy + 4);
  ctx.font = "600 14px ui-monospace, Menlo, monospace";
  ctx.fillStyle = "rgba(196,181,253,0.6)";
  ctx.fillText(serial, W - inner - 34, hy + 24);
  ctx.textAlign = "left";

  // Execution Score — left of the grade medallion
  const medCxForScore = W - inner - 100;
  const scoreX = medCxForScore - 220;
  const scoreLabelY = hy + 64;
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "600 13px ui-sans-serif, system-ui";
  ctx.fillText("EXECUTION SCORE", scoreX, scoreLabelY);
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 48px ui-monospace, Menlo, monospace";
  const scoreNumText = `${d.executionScore}`;
  ctx.fillText(scoreNumText, scoreX, scoreLabelY + 20);
  const scoreNumWidth = ctx.measureText(scoreNumText).width;
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = "700 18px ui-sans-serif, system-ui";
  ctx.fillText("/100", scoreX + scoreNumWidth + 4, scoreLabelY + 46);

  // Grade medallion — the celebratory focal point
  const medCx = W - inner - 100;
  const medCy = hy + 110;
  const medR = 56;
  ctx.save();
  ctx.shadowColor = theme.glow;
  ctx.shadowBlur = 26;
  const medGrad = ctx.createRadialGradient(medCx, medCy, 4, medCx, medCy, medR);
  medGrad.addColorStop(0, "rgba(255,255,255,0.16)");
  medGrad.addColorStop(1, "rgba(255,255,255,0.02)");
  ctx.beginPath();
  ctx.arc(medCx, medCy, medR, 0, Math.PI * 2);
  ctx.fillStyle = medGrad;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = theme.ring;
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 44px ui-monospace, Menlo, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(d.grade, medCx, medCy - 4);
  ctx.font = "700 12px ui-sans-serif, system-ui";
  ctx.fillStyle = theme.primary;
  ctx.fillText(theme.tier, medCx, medCy + 30);
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  // Asset + direction
  let y = hy + 190;
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 60px ui-sans-serif, system-ui";
  ctx.fillText(d.asset.toUpperCase(), inner + 34, y);

  const dirColor = d.direction === "buy" ? "#22c55e" : "#ef4444";
  const dirLabel = d.direction === "buy" ? "LONG" : "SHORT";
  ctx.font = "700 22px ui-sans-serif, system-ui";
  const assetWidth = ctx.measureText(d.asset.toUpperCase()).width;
  const pillX = inner + 34 + assetWidth + 24;
  const pillY = y + 14;
  const pillW = 110;
  const pillH = 38;
  roundRect(ctx, pillX, pillY, pillW, pillH, 19);
  ctx.fillStyle = `${dirColor}33`;
  ctx.fill();
  ctx.strokeStyle = `${dirColor}80`;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = dirColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(dirLabel, pillX + pillW / 2, pillY + pillH / 2 + 1);
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  // Verdict banner
  y += 100;
  const verdictMap: Record<Verdict, { label: string; color: string }> = {
    valid: { label: "✓  VALID SETUP", color: "#22c55e" },
    adjust: { label: "⚠  ADJUST BEFORE ENTRY", color: "#f59e0b" },
    no: { label: "✕  DO NOT TAKE THIS TRADE", color: "#ef4444" },
  };
  const v = verdictMap[d.verdict];
  const bannerH = 96;
  roundRect(ctx, inner + 34, y, W - inner * 2 - 68, bannerH, 16);
  ctx.fillStyle = `${v.color}22`;
  ctx.fill();
  ctx.strokeStyle = `${v.color}66`;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = v.color;
  ctx.font = "800 30px ui-sans-serif, system-ui";
  ctx.textBaseline = "top";
  ctx.fillText(v.label, inner + 64, y + 20);
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = "500 15px ui-sans-serif, system-ui";
  ctx.fillText(d.validSubText, inner + 64, y + 58);
  y = y + bannerH - 88; // keep downstream layout stable


  // Suggested size block
  y += 126;
  roundRect(ctx, inner + 34, y, W - inner * 2 - 68, 126, 18);
  const sizeGrad = ctx.createLinearGradient(0, y, W, y + 126);
  sizeGrad.addColorStop(0, "rgba(168,85,247,0.25)");
  sizeGrad.addColorStop(1, "rgba(236,72,153,0.06)");
  ctx.fillStyle = sizeGrad;
  ctx.fill();
  ctx.strokeStyle = "rgba(196,181,253,0.4)";
  ctx.stroke();
  ctx.fillStyle = "#c4b5fd";
  ctx.font = "600 15px ui-sans-serif, system-ui";
  ctx.fillText("SUGGESTED EXECUTION SIZE", inner + 64, y + 20);
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 52px ui-monospace, Menlo, monospace";
  ctx.fillText(d.sizeText, inner + 64, y + 48);

  // Stats grid
  y += 164;
  const stats: { label: string; value: string; color?: string }[] = [
    { label: "ENTRY", value: d.entry },
    { label: "STOP LOSS", value: d.stop, color: "#ef4444" },
    { label: "TAKE PROFIT", value: d.tp, color: "#22c55e" },
    { label: "DOLLAR RISK", value: d.riskText, color: "#ef4444" },
    { label: "ESTIMATED REWARD", value: d.rewardText, color: "#22c55e" },
    { label: "RISK : REWARD", value: d.rrText },
    { label: "MOVE TO STOP", value: d.moveStopText },
    { label: "MOVE TO TARGET", value: d.moveTargetText },
  ];

  const cols = 2;
  const gridW = W - inner * 2 - 68;
  const cellW = (gridW - 20) / cols;
  const cellH = 96;
  stats.forEach((stat, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = inner + 34 + col * (cellW + 20);
    const cy = y + row * (cellH + 14);
    roundRect(ctx, cx, cy, cellW, cellH, 14);
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "600 12px ui-sans-serif, system-ui";
    ctx.fillText(stat.label, cx + 18, cy + 18);
    ctx.fillStyle = stat.color ?? "#ffffff";
    ctx.font = "700 24px ui-monospace, Menlo, monospace";
    ctx.fillText(stat.value, cx + 18, cy + 45);
    if (stat.label === "DOLLAR RISK" && d.riskSubText) {
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.font = "500 12px ui-sans-serif, system-ui";
      ctx.fillText(d.riskSubText, cx + 18, cy + 74);
    }
  });

  // "How size is calculated" callout (commodities only) — mirrors the in-app
  // expandable trace so a shared card is self-explanatory.
  if (d.howCalcText) {
    const boxY = y + 4 * (cellH + 14) + 8;
    const boxH = 74;
    const boxW = W - inner * 2 - 68;
    roundRect(ctx, inner + 34, boxY, boxW, boxH, 14);
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.stroke();
    // small info glyph
    ctx.fillStyle = "rgba(196,181,253,0.85)";
    ctx.font = "800 20px ui-sans-serif, system-ui";
    ctx.textBaseline = "middle";
    ctx.fillText("ⓘ", inner + 58, boxY + boxH / 2);
    ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "600 12px ui-sans-serif, system-ui";
    ctx.fillText("HOW SIZE IS CALCULATED", inner + 90, boxY + 14);
    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.font = "500 14px ui-sans-serif, system-ui";
    wrapText(ctx, d.howCalcText, inner + 90, boxY + 36, boxW - 110, 18);
  }


  // Footer — foil divider, seal, serial, tagline
  const footerRuleY = H - inner - 96;
  const ruleGrad = ctx.createLinearGradient(inner + 34, 0, W - inner - 34, 0);
  ruleGrad.addColorStop(0, "rgba(255,255,255,0)");
  ruleGrad.addColorStop(0.5, theme.ring);
  ruleGrad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.strokeStyle = ruleGrad;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(inner + 34, footerRuleY);
  ctx.lineTo(W - inner - 34, footerRuleY);
  ctx.stroke();

  const footerY = H - inner - 66;
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "500 15px ui-sans-serif, system-ui";
  ctx.fillText(`Balance ${d.balanceText} · Risk ${d.riskPctText} · ${serial}`, inner + 34, footerY);

  ctx.textAlign = "right";
  ctx.fillStyle = theme.primary;
  ctx.font = "700 15px ui-sans-serif, system-ui";
  ctx.fillText("✓ PIPGRADE VERIFIED", W - inner - 34, footerY);
  ctx.textAlign = "left";

  ctx.fillStyle = "rgba(196,181,253,0.7)";
  ctx.font = "600 15px ui-sans-serif, system-ui";
  ctx.textAlign = "center";
  ctx.fillText("Every trade deserves a grade before it deserves your capital.", W / 2, footerY + 26);
  ctx.textAlign = "left";

  canvas.toBlob((blob) => {
    if (!blob) {
      reject(new Error("Canvas toBlob returned null"));
      return;
    }
    resolve(blob);
  }, "image/png");
  });
}

// Cross-platform save/share for the generated trade-card PNG.
//
// iOS WebKit (Safari *and* in-app WebViews, e.g. the Lovable preview app) has
// never reliably supported the classic `<a download>` blob-URL trick -- the
// click is a silent no-op, which is why "Generate Trade Card" looked broken
// on iPhone. Web Share API (with a File) is the reliable path there. If that
// isn't available either (older iOS, some Android WebViews), fall back to a
// full-screen preview the user can long-press to save, which works
// everywhere because it doesn't depend on any download API at all.
async function saveOrShareTradeCard(
  blob: Blob,
  filename: string,
  onManualSaveNeeded: (url: string) => void
) {
  try {
    const file = new File([blob], filename, { type: "image/png" });
    const nav = navigator as Navigator & { canShare?: (data?: ShareData) => boolean };
    if (nav.canShare && nav.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: "PipGrade Trade Card" });
      return;
    }
  } catch (err) {
    // AbortError = user cancelled the native share sheet — that's a
    // deliberate choice, not a failure, so don't fall through to anything else.
    if (err instanceof Error && err.name === "AbortError") return;
    // Any other share failure falls through to the methods below.
  }

  const isCoarsePointer =
    typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
  const url = URL.createObjectURL(blob);

  if (!isCoarsePointer) {
    // Mouse-driven desktop browsers: the classic download attribute is reliable here.
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return;
  }

  // Touch device with no file-sharing support: show it full-screen so the
  // user can long-press -> Save Image. Caller owns revoking this URL once
  // the overlay closes.
  onManualSaveNeeded(url);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
