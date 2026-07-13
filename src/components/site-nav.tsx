import { Link, useRouterState } from "@tanstack/react-router";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { to: "/validate", label: "Validate a Trade" },
  { to: "/growth", label: "Growth Planner" },
  { to: "/scaling", label: "Scaling Plan" },
];

export function SiteNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 sm:px-6">
      <Link to="/" className="flex items-center gap-3">
        <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-primary/5 text-primary ring-1 ring-primary/40 shadow-[0_0_24px_-6px_var(--primary)]">
          <Activity className="h-5 w-5" />
          <span className="absolute -inset-px rounded-xl ring-1 ring-inset ring-white/5" />
        </div>
        <span className="brand-gradient-text text-lg font-bold tracking-tight">PipGrade</span>
      </Link>
      <nav className="flex items-center gap-1 rounded-full border border-border/50 bg-secondary/30 p-1">
        {LINKS.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors sm:text-sm",
              pathname === l.to
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
