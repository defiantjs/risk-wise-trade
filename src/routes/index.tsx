import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  Gauge,
  ListChecks,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: Landing });

const FLOW = ["Analyze", "Validate", "Execute", "Review", "Improve"];

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Execution Verdict",
    body: "Every setup returns VALID SETUP, ADJUST BEFORE ENTRY, or DO NOT TAKE — before you risk capital, not after.",
  },
  {
    icon: Gauge,
    title: "Letter Grade",
    body: "Risk and reward are scored A through Warning, so quality is a number you can track over time, not a feeling.",
  },
  {
    icon: ListChecks,
    title: "Coaching & Checklist",
    body: "Every report includes a plain-language read on the setup and a pre-execution checklist — structure, alignment, news, discipline.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-4 pb-16 pt-10 text-center sm:px-6 sm:pt-16">
        <div className="mx-auto mb-6 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-primary">
          <Sparkles className="h-3 w-3" /> Execution intelligence, not another indicator
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          <span className="brand-gradient-text">Every trade deserves a grade</span>
          <br />
          before it deserves your capital.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg">
          PipGrade validates a trade&apos;s risk, reward, and sizing the moment you describe it — and returns
          an Execution Report with a verdict and a grade. Not a signal service. Not a journal. A filter.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/validate"
            className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-[0_0_32px_-8px_var(--primary)] transition-transform hover:scale-[1.02]"
          >
            Validate a Trade <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/growth"
            className="inline-flex h-12 items-center gap-2 rounded-lg border border-border/60 bg-secondary/30 px-6 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/60"
          >
            <TrendingUp className="h-4 w-4" /> See the Growth Planner
          </Link>
        </div>
      </section>

      {/* Problem framing */}
      <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
        <Card className="glass border-border/50 shadow-xl shadow-black/20">
          <CardContent className="grid gap-8 p-6 sm:p-8 lg:grid-cols-2">
            <div>
              <h2 className="text-lg font-semibold">Great traders don&apos;t just find good setups.</h2>
              <p className="mt-1 text-lg font-semibold text-primary">They consistently filter out bad ones.</p>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Most tools help you find trades, chart markets, or review what already happened. Very few answer
                the question that actually protects your account: does this trade deserve capital, right now,
                before you click buy or sell?
              </p>
            </div>
            <div className="flex flex-col justify-center gap-2 rounded-lg border border-border/40 bg-secondary/20 p-4">
              {FLOW.map((step, i) => (
                <div key={step} className="flex items-center gap-3 text-sm">
                  <span
                    className={cn(
                      "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      step === "Validate"
                        ? "bg-primary text-primary-foreground shadow-[0_0_16px_-4px_var(--primary)]"
                        : "bg-secondary text-muted-foreground"
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className={step === "Validate" ? "font-semibold text-foreground" : "text-muted-foreground"}>
                    {step}
                  </span>
                  {step === "Validate" && (
                    <span className="ml-auto rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                      PipGrade
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title} className="glass border-border/50">
              <CardContent className="p-5">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <f.icon className="h-4.5 w-4.5" />
                </div>
                <h3 className="text-sm font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{f.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Differentiator */}
      <section className="mx-auto max-w-4xl px-4 pb-20 text-center sm:px-6">
        <div className="rounded-xl border border-border/40 bg-secondary/10 p-6 sm:p-8">
          <p className="text-sm text-muted-foreground">TradingView answers</p>
          <p className="text-xl font-semibold sm:text-2xl">&ldquo;Where should I trade?&rdquo;</p>
          <div className="my-3 flex items-center justify-center gap-2 text-primary">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">PipGrade answers something else</span>
          </div>
          <p className="text-sm text-muted-foreground">PipGrade answers</p>
          <p className="text-xl font-semibold text-primary sm:text-2xl">&ldquo;Should I trade this?&rdquo;</p>
        </div>
        <p className="mt-10 text-xs leading-relaxed text-muted-foreground">
          This tool is for educational purposes only and does not provide financial advice.
        </p>
      </section>
    </div>
  );
}
