import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Activity, CheckCircle2, AlertTriangle, BellRing, ArrowUpRight, Plus } from "lucide-react";
import { AppShell, StatusDot, MethodBadge, SeverityBadge } from "@/components/app/AppShell";
import { mockEndpoints, mockDrifts, timeAgo, type DriftLog } from "@/lib/mock";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — SchemaGuard" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const [tick, setTick] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);

  // Simulate Socket.io drift_alert events
  useEffect(() => {
    const i = setInterval(() => {
      setTick((t) => t + 1);
      setFlash("drift_alert · ep_1 · TYPE_CHANGED on customer.tier");
      setTimeout(() => setFlash(null), 2400);
    }, 12_000);
    return () => clearInterval(i);
  }, []);

  const stats = useMemo(() => {
    const total = mockEndpoints.length;
    const healthy = mockEndpoints.filter((e) => e.status === "healthy").length;
    const drifted = mockEndpoints.filter((e) => e.status === "drifted").length;
    const unack = mockDrifts.filter((d) => d.status === "unacknowledged").length;
    return { total, healthy, drifted, unack };
  }, [tick]);

  const recent = [...mockDrifts].sort((a, b) => +new Date(b.detectedAt) - +new Date(a.detectedAt)).slice(0, 5);

  return (
    <AppShell title="Dashboard" subtitle="Real-time overview of your monitored endpoints"
      actions={<Link to="/endpoints" className="inline-flex h-8 items-center gap-1.5 rounded-md bg-foreground px-3 text-xs font-semibold text-background hover:bg-white">
        <Plus className="size-3.5" /> Add endpoint</Link>}>

      {flash && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs animate-fade-in">
          <span className="size-1.5 rounded-full bg-danger animate-pulse-soft" />
          <span className="text-mono text-danger">{flash}</span>
          <Link to="/alerts" className="ml-auto text-mono text-[11px] text-danger/80 hover:text-danger">view →</Link>
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Activity} label="Total Endpoints" value={stats.total} hint="across all envs" />
        <StatCard icon={CheckCircle2} label="Healthy" value={stats.healthy} accent="brand" hint="baseline matched" />
        <StatCard icon={AlertTriangle} label="Drifted" value={stats.drifted} accent="danger" hint="schema mismatch" />
        <StatCard icon={BellRing} label="Unacknowledged" value={stats.unack} accent="amber" hint="needs attention" />
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PanelHeader title="Monitored endpoints" hint={`${mockEndpoints.length} total`} action={<Link to="/endpoints" className="text-mono text-[11px] text-muted-foreground hover:text-foreground">manage →</Link>} />
          <div className="overflow-hidden rounded-lg border border-border/60 bg-surface-2/40">
            <table className="w-full text-sm">
              <thead className="text-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr className="border-b border-border/60">
                  <th className="px-4 py-2.5 text-left font-medium">Status</th>
                  <th className="px-4 py-2.5 text-left font-medium">Endpoint</th>
                  <th className="px-4 py-2.5 text-left font-medium">Method</th>
                  <th className="px-4 py-2.5 text-right font-medium">Last check</th>
                </tr>
              </thead>
              <tbody>
                {mockEndpoints.map((e) => (
                  <tr key={e.id} className="border-b border-border/40 last:border-0 transition-colors hover:bg-accent/30">
                    <td className="px-4 py-3"><StatusDot status={e.status} /></td>
                    <td className="px-4 py-3">
                      <Link to="/endpoints/$id" params={{ id: e.id }} className="font-medium hover:text-brand">{e.name}</Link>
                      <div className="text-mono truncate text-[11px] text-muted-foreground">{e.url}</div>
                    </td>
                    <td className="px-4 py-3"><MethodBadge method={e.method} /></td>
                    <td className="text-mono px-4 py-3 text-right text-[11px] text-muted-foreground">{timeAgo(e.lastCheckedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <PanelHeader title="Recent drift events" hint="last 5" action={<Link to="/alerts" className="text-mono text-[11px] text-muted-foreground hover:text-foreground">all →</Link>} />
          <div className="space-y-2">
            {recent.map((d) => <RecentDriftItem key={d.id} drift={d} />)}
          </div>
        </div>
      </section>
    </AppShell>
  );
}

function StatCard({ icon: Icon, label, value, hint, accent }: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: number; hint: string;
  accent?: "brand" | "danger" | "amber";
}) {
  const accentClass = {
    brand: "text-brand bg-brand/10 border-brand/20",
    danger: "text-danger bg-danger/10 border-danger/20",
    amber: "text-amber-300 bg-amber-500/10 border-amber-500/20",
  }[accent ?? "brand"];
  return (
    <div className="group relative overflow-hidden rounded-lg border border-border/60 bg-surface-2/40 p-4 transition-colors hover:border-border">
      <div className="flex items-start justify-between">
        <div className={`grid size-8 place-items-center rounded-md border ${accent ? accentClass : "border-border bg-accent text-muted-foreground"}`}>
          <Icon className="size-4" />
        </div>
        <ArrowUpRight className="size-4 text-muted-foreground/40 transition-colors group-hover:text-foreground" />
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">{value}</div>
      <div className="text-mono mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground/70">{hint}</div>
    </div>
  );
}

function PanelHeader({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between">
      <div>
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {hint && <span className="text-mono text-[10px] uppercase tracking-widest text-muted-foreground">{hint}</span>}
      </div>
      {action}
    </div>
  );
}

function RecentDriftItem({ drift }: { drift: DriftLog }) {
  return (
    <Link to="/endpoints/$id" params={{ id: drift.endpointId }}
      className="block rounded-lg border border-border/60 bg-surface-2/40 p-3 transition-colors hover:border-border hover:bg-surface-2/70">
      <div className="flex items-center justify-between gap-2">
        <SeverityBadge severity={drift.severity} />
        <span className="text-mono text-[10px] text-muted-foreground">{timeAgo(drift.detectedAt)}</span>
      </div>
      <div className="mt-2 text-xs font-medium">{drift.endpointName}</div>
      <div className="text-mono mt-1 truncate text-[11px] text-muted-foreground">{drift.summary}</div>
    </Link>
  );
}
