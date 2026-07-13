import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Gauge,
  ListChecks,
  Scale,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: Landing });

const FLOW = ["Analyze", "Validate", "Execute", "Review", "Improve"];

const HOW_IT_WORKS = [
  { step: "1", title: "Describe the trade", body: "Balance, risk %, direction, entry, stop, take profit. That's the whole form." },
  { step: "2", title: "Get your Execution Report", body: "A live verdict, letter grade, position size, and a pre-execution checklist — updated as you type." },
  { step: "3", title: "Execute or adjust", body: "Take it if it's valid, tighten it if it's borderline, walk away if it's not. The filter did its job." },
];

const MODULES = [
  {
    icon: ShieldCheck,
    title: "Validate a Trade",
    body: "Describe a setup and get an Execution Report — verdict, grade, sizing, coaching — before you risk capital.",
    to: "/validate" as const,
    cta: "Validate a trade",
  },
  {
    icon: TrendingUp,
    title: "Growth Planner",
    body: "See where consistent, validated trades take your account — a smoothed equity curve from your own win-rate and R:R.",
    to: "/growth" as const,
    cta: "Project your growth",
  },
  {
    icon: Calendar,
    title: "Scaling Plan",
    body: "Answer five questions and get a day-by-day roadmap — risk rules, execution commandments, and a target for every day.",
    to: "/scaling" as const,
    cta: "Build your plan",
  },
];

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

const NOT_LIST = ["Not a signal service", "Not an indicator", "Not a trading journal"];

const FAQS = [
  {
    q: "Is PipGrade a signal service?",
    a: "No. PipGrade never tells you what to trade or when to enter. You bring the setup — PipGrade tells you whether the risk and reward actually justify taking it.",
  },
  {
    q: "Do I need to create an account?",
    a: "No. Every module runs entirely in your browser. Nothing is saved or sent anywhere unless you choose to export a trade card.",
  },
  {
    q: "How is the grade calculated?",
    a: "From two numbers you control: your risk-to-reward ratio and the percent of your account you're risking. Grade A needs R:R ≥ 3 and risk ≤ 1%. Grade B needs R:R ≥ 2 and risk ≤ 2%. Anything weaker gets a C or a Warning — no hidden inputs.",
  },
  {
    q: "What markets or assets does it support?",
    a: "Forex, metals & energy (gold, silver, oil/WTI), indices, crypto, and stocks/ETFs. PipGrade detects the instrument from what you type and adjusts the sizing math automatically.",
  },
  {
    q: "Is this financial advice?",
    a: "No. PipGrade is an educational risk-management tool, not a financial advisor or broker. Always do your own due diligence before risking capital.",
  },
  {
    q: "What's the difference between the Growth Planner and the Scaling Plan?",
    a: "The Growth Planner projects a smoothed monthly curve from your own win-rate and R:R assumptions — good for “where does my system go?” The Scaling Plan is a fixed, day-by-day roadmap built from five inputs — better for a prop-firm challenge or a hard deadline.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-4 pb-14 pt-10 text-center sm:px-6 sm:pt-16">
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
          an Execution Report with a verdict and a grade.
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {NOT_LIST.map((n) => (
            <span key={n} className="rounded-full border border-border/50 bg-secondary/30 px-2.5 py-1 text-[11px] text-muted-foreground">
              {n}
            </span>
          ))}
        </div>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/validate"
            className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-[0_0_32px_-8px_var(--primary)] transition-transform hover:scale-[1.02]"
          >
            Validate a Trade <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex h-12 items-center gap-2 rounded-lg border border-border/60 bg-secondary/30 px-6 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/60"
          >
            See how it works
          </a>
        </div>
      </section>

      {/* How it works + live preview */}
      <section id="how-it-works" className="mx-auto max-w-5xl scroll-mt-20 px-4 pb-16 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-primary">How it works</h2>
            <div className="mt-4 space-y-5">
              {HOW_IT_WORKS.map((step) => (
                <div key={step.step} className="flex gap-4">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-sm font-bold text-primary">
                    {step.step}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold">{step.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Illustrative mini Execution Report */}
          <Card className="glass border-primary/25 shadow-2xl shadow-primary/10 ring-1 ring-primary/20">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Execution Report</span>
                <span className="rounded-full bg-secondary/50 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">Example</span>
              </div>
              <div className="rounded-lg border border-success/40 bg-gradient-to-br from-success/25 via-success/10 to-transparent p-3">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-sm font-bold tracking-wide">VALID SETUP</span>
                </div>
                <p className="mt-1 text-[11px] text-foreground/80">Risk and reward profile meet the threshold.</p>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/60 bg-secondary/30 px-3 py-2">
                <span className="text-xs font-medium">EURUSD &middot; Long</span>
                <span className="font-mono text-sm font-bold text-success">B <span className="text-[10px] font-medium opacity-80">(Valid Setup)</span></span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <MiniStat icon={<ShieldCheck className="h-3 w-3" />} label="Risk" value="$200" tone="danger" />
                <MiniStat icon={<TrendingUp className="h-3 w-3" />} label="Reward" value="$600" tone="success" />
                <MiniStat icon={<Scale className="h-3 w-3" />} label="R : R" value="3.0 : 1" />
              </div>
              <div className="flex items-center gap-2 rounded-md border border-border/60 bg-background/40 p-2.5 text-[11px] text-foreground/80">
                <ClipboardCheck className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
                Strong reward profile. Still confirm market structure before entering.
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Three modules */}
      <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
        <h2 className="mb-4 text-center text-xs font-semibold uppercase tracking-wider text-primary">Three modules, one filter</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {MODULES.map((m) => (
            <Link key={m.to} to={m.to} className="group">
              <Card className="glass h-full border-border/50 transition-colors group-hover:border-primary/40">
                <CardContent className="flex h-full flex-col p-5">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <m.icon className="h-4.5 w-4.5" />
                  </div>
                  <h3 className="text-sm font-semibold">{m.title}</h3>
                  <p className="mt-1.5 flex-1 text-xs leading-relaxed text-muted-foreground">{m.body}</p>
                  <span className="mt-3 flex items-center gap-1 text-xs font-semibold text-primary">
                    {m.cta} <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Problem framing + vision */}
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
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Where this is going</p>
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
                      PipGrade today
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
      <section className="mx-auto max-w-4xl px-4 pb-16 text-center sm:px-6">
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
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 pb-20 sm:px-6">
        <h2 className="mb-1 text-center text-xs font-semibold uppercase tracking-wider text-primary">FAQ</h2>
        <p className="mb-6 text-center text-lg font-semibold">Common questions</p>
        <Card className="glass border-border/50">
          <CardContent className="p-2 sm:p-4">
            <Accordion type="single" collapsible className="w-full">
              {FAQS.map((f, i) => (
                <AccordionItem key={i} value={`item-${i}`} className="border-border/40 px-2">
                  <AccordionTrigger className="text-sm font-medium hover:no-underline">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-muted-foreground">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        <p className="mt-10 text-center text-xs leading-relaxed text-muted-foreground">
          This tool is for educational purposes only and does not provide financial advice.
        </p>
      </section>
    </div>
  );
}

function MiniStat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: "success" | "danger" }) {
  const toneClass = tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-foreground";
  return (
    <div className="rounded-md border border-border/60 bg-secondary/30 p-2">
      <div className="flex items-center gap-1 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={cn("mt-0.5 font-mono text-xs font-semibold", toneClass)}>{value}</div>
    </div>
  );
}
