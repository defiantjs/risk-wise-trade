import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, TrendingUp, Wallet } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteNav } from "@/components/site-nav";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/growth")({ component: GrowthPlanner });

const DEFAULTS = {
  balance: "10000",
  riskPct: "1",
  avgRR: "2",
  winRate: "45",
  tradesPerMonth: "15",
};

function num(v: string): number | null {
  const n = Number(v.replace(/[, _]/g, "").trim());
  return Number.isFinite(n) && v.trim() !== "" ? n : null;
}

function fmtMoney(v: number) {
  return v.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

const MONTHS = 12;

function GrowthPlanner() {
  const [s, setS] = useState(DEFAULTS);
  const set = <K extends keyof typeof DEFAULTS>(k: K, v: (typeof DEFAULTS)[K]) =>
    setS((prev) => ({ ...prev, [k]: v }));

  const model = useMemo(() => {
    const balance = num(s.balance);
    const riskPct = num(s.riskPct);
    const avgRR = num(s.avgRR);
    const winRate = num(s.winRate);
    const tradesPerMonth = num(s.tradesPerMonth);

    const ready =
      balance !== null && balance > 0 &&
      riskPct !== null && riskPct > 0 && riskPct <= 100 &&
      avgRR !== null && avgRR > 0 &&
      winRate !== null && winRate >= 0 && winRate <= 100 &&
      tradesPerMonth !== null && tradesPerMonth > 0;

    if (!ready) return { ready: false as const };

    const wr = winRate! / 100;
    const r = riskPct! / 100;

    // Expectancy per trade, as a fraction of balance risked at trade time.
    const expectancyFraction = wr * (r * avgRR!) - (1 - wr) * r;
    const monthlyGrowth = Math.pow(1 + expectancyFraction, tradesPerMonth!) - 1;

    const points: { month: number; balance: number }[] = [{ month: 0, balance: balance! }];
    let bal = balance!;
    for (let m = 1; m <= MONTHS; m++) {
      bal = bal * (1 + monthlyGrowth);
      points.push({ month: m, balance: Math.max(0, bal) });
    }

    const projected12mo = points[MONTHS].balance;
    const totalGrowthPct = ((projected12mo - balance!) / balance!) * 100;
    const expectancyDollar = balance! * r * (wr * avgRR! - (1 - wr));

    return {
      ready: true as const,
      points,
      monthlyGrowth: monthlyGrowth * 100,
      projected12mo,
      totalGrowthPct,
      expectancyFraction: expectancyFraction * 100,
      expectancyDollar,
      isNegativeExpectancy: expectancyFraction <= 0,
    };
  }, [s]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-2 sm:px-6">
        <header className="mb-8">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Growth Planner</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            If you keep taking only validated setups at this quality and consistency, here&apos;s where the
            system goes. This projects your <em>process</em>, not a promise.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="glass border-border/50 shadow-xl shadow-black/20 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Wallet className="h-4 w-4 text-primary" /> System inputs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Starting balance" hint="USD">
                <PrefixInput value={s.balance} onChange={(v) => set("balance", v)} placeholder="10,000" />
              </Field>
              <Field label="Risk per trade" hint="% of balance">
                <SuffixInput value={s.riskPct} onChange={(v) => set("riskPct", v)} placeholder="1" />
              </Field>
              <Field label="Average R:R" hint="reward per unit risk">
                <Input value={s.avgRR} onChange={(e) => set("avgRR", e.target.value)} placeholder="2" inputMode="decimal" className="font-mono" />
              </Field>
              <Field label="Win rate" hint="% of trades">
                <SuffixInput value={s.winRate} onChange={(v) => set("winRate", v)} placeholder="45" />
              </Field>
              <Field label="Trades per month" hint="validated setups taken">
                <Input value={s.tradesPerMonth} onChange={(e) => set("tradesPerMonth", e.target.value)} placeholder="15" inputMode="decimal" className="font-mono" />
              </Field>
            </CardContent>
          </Card>

          <div className="lg:col-span-3">
            <Card className="glass border-primary/25 shadow-2xl shadow-primary/10 ring-1 ring-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Projected equity curve</CardTitle>
              </CardHeader>
              <CardContent>
                {model.ready ? (
                  <div className="space-y-5">
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={model.points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.45} />
                              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                          <XAxis
                            dataKey="month"
                            tickFormatter={(m) => `M${m}`}
                            stroke="var(--muted-foreground)"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            tickFormatter={(v) => fmtMoney(v)}
                            stroke="var(--muted-foreground)"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            width={70}
                          />
                          <Tooltip
                            formatter={(v: number) => [fmtMoney(v), "Balance"]}
                            labelFormatter={(m) => `Month ${m}`}
                            contentStyle={{
                              background: "var(--card)",
                              border: "1px solid var(--border)",
                              borderRadius: 8,
                              fontSize: 12,
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="balance"
                            stroke="var(--primary)"
                            strokeWidth={2}
                            fill="url(#growthFill)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <Stat label="Trade expectancy" value={fmtMoney(model.expectancyDollar)} tone={model.isNegativeExpectancy ? "danger" : "success"} />
                      <Stat label="Monthly growth" value={`${model.monthlyGrowth.toFixed(1)}%`} tone={model.isNegativeExpectancy ? "danger" : "success"} />
                      <Stat label="12-mo projection" value={fmtMoney(model.projected12mo)} tone="neutral" />
                      <Stat label="12-mo growth" value={`${model.totalGrowthPct >= 0 ? "+" : ""}${model.totalGrowthPct.toFixed(0)}%`} tone={model.isNegativeExpectancy ? "danger" : "success"} />
                    </div>

                    {model.isNegativeExpectancy ? (
                      <div className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                        <span className="leading-relaxed">
                          This combination of win rate and R:R has negative expectancy &mdash; the system loses
                          money over time even with perfect discipline. Raise your average R:R or win rate before
                          scaling size.
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 rounded-md border border-primary/25 bg-primary/5 p-3 text-xs text-foreground/80">
                        <TrendingUp className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
                        <span className="leading-relaxed">
                          Assumes every trade is a PipGrade-validated setup taken with consistent risk and no
                          deviation. Real results vary &mdash; this models the process, not a guarantee.
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    Fill in the system inputs to project your equity curve.
                  </p>
                )}
              </CardContent>
            </Card>

            {model.ready && (
              <Link
                to="/scaling"
                className="mt-3 flex items-center justify-between rounded-lg border border-primary/25 bg-primary/5 px-3.5 py-2.5 text-xs text-foreground/85 transition-colors hover:bg-primary/10"
              >
                <span>Want a day-by-day roadmap instead of a monthly curve?</span>
                <span className="font-semibold text-primary">Scaling Plan &rarr;</span>
              </Link>
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

function Stat({ label, value, tone }: { label: string; value: string; tone: "success" | "danger" | "neutral" }) {
  const toneClass = tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-foreground";
  return (
    <div className="rounded-md border border-border/60 bg-secondary/30 p-3">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-1 truncate font-mono text-sm font-semibold sm:text-base", toneClass)}>{value}</div>
    </div>
  );
}
