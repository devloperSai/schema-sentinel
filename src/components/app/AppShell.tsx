import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Shield, LayoutDashboard, Network, Bell, LogOut, Activity, Globe2 } from "lucide-react";
import { auth } from "@/lib/mock";
import type { ReactNode } from "react";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/endpoints", label: "Endpoints", icon: Network },
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/environments", label: "Environments", icon: Globe2 },
] as const;

export function AppShell({ children, title, subtitle, actions }: {
  children: ReactNode; title: string; subtitle?: string; actions?: ReactNode;
}) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const user = auth.getUser();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border/60 bg-surface-2/40 backdrop-blur md:flex">
        <Link to="/dashboard" className="flex h-14 items-center gap-2 border-b border-border/60 px-5">
          <div className="grid size-6 place-items-center rounded-sm bg-brand">
            <Shield className="size-3.5 text-brand-foreground" strokeWidth={2.5} />
          </div>
          <span className="font-semibold tracking-tight">SchemaGuard</span>
        </Link>
        <nav className="flex-1 space-y-1 p-3">
          {nav.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || pathname.startsWith(to + "/");
            return (
              <Link key={to} to={to}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                }`}>
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border/60 p-3">
          <div className="mb-2 flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground">
            <Activity className="size-3.5 text-brand" />
            <span className="text-mono">proxy.live</span>
            <span className="ml-auto size-1.5 rounded-full bg-brand animate-pulse-soft" />
          </div>
          <div className="flex items-center gap-2 rounded-md bg-surface-2 px-2 py-2">
            <div className="grid size-7 place-items-center rounded-full bg-brand/20 text-xs font-semibold text-brand">
              {(user?.name?.[0] ?? "U").toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium">{user?.name ?? "User"}</div>
              <div className="truncate text-[10px] text-muted-foreground">{user?.email}</div>
            </div>
            <button onClick={() => { auth.logout(); navigate({ to: "/login" }); }}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" aria-label="Sign out">
              <LogOut className="size-3.5" />
            </button>
          </div>
        </div>
      </aside>

      <div className="md:pl-60">
        <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
          <div className="flex h-14 items-center justify-between gap-4 px-6">
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold tracking-tight">{title}</h1>
              {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-2">{actions}</div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
      </div>
    </div>
  );
}

export function StatusDot({ status }: { status: "healthy" | "drifted" | "paused" }) {
  const cfg = {
    healthy: "bg-brand shadow-[0_0_8px] shadow-brand/60",
    drifted: "bg-danger shadow-[0_0_8px] shadow-danger/60 animate-pulse-soft",
    paused: "bg-muted-foreground/60",
  }[status];
  return <span className={`inline-block size-2 rounded-full ${cfg}`} />;
}

/** Postman-style method colors. */
export const METHOD_COLOR: Record<string, string> = {
  GET: "text-teal-300",
  POST: "text-amber-300",
  PUT: "text-sky-300",
  PATCH: "text-violet-300",
  DELETE: "text-rose-300",
  HEAD: "text-cyan-300",
  OPTIONS: "text-pink-300",
};
export function MethodBadge({ method }: { method: string }) {
  const cls = METHOD_COLOR[method] ?? "text-muted-foreground";
  return <span className={`text-mono inline-flex h-5 items-center text-[10px] font-bold tracking-wider ${cls}`}>{method}</span>;
}

export function SeverityBadge({ severity }: { severity: "low" | "medium" | "high" | "critical" }) {
  const cfg = {
    low: "text-muted-foreground bg-muted border-border",
    medium: "text-amber-300 bg-amber-500/10 border-amber-500/20",
    high: "text-orange-300 bg-orange-500/10 border-orange-500/20",
    critical: "text-rose-300 bg-rose-500/10 border-rose-500/20",
  }[severity];
  return <span className={`inline-flex h-5 items-center rounded border px-1.5 text-[10px] font-semibold uppercase tracking-wider ${cfg}`}>{severity}</span>;
}
