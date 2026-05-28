import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Check, RefreshCcw, Minus, Plus, ArrowRightLeft } from "lucide-react";
import { AppShell, MethodBadge, SeverityBadge, StatusDot } from "@/components/app/AppShell";
import { mockEndpoints, mockDrifts, timeAgo, type DriftLog, type ChangeType } from "@/lib/mock";

export const Route = createFileRoute("/_app/endpoints/$id")({
  head: ({ params }) => ({ meta: [{ title: `${params.id} — SchemaGuard` }] }),
  loader: ({ params }) => {
    const ep = mockEndpoints.find((e) => e.id === params.id);
    if (!ep) throw notFound();
    return { ep };
  },
  component: EndpointDetail,
  notFoundComponent: () => <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Endpoint not found.</div>,
});

function EndpointDetail() {
  const { ep } = Route.useLoaderData();
  const initial = mockDrifts.filter((d) => d.endpointId === ep.id);
  const [logs, setLogs] = useState<DriftLog[]>(initial);

  const update = (id: string, status: DriftLog["status"]) =>
    setLogs((xs) => xs.map((d) => (d.id === id ? { ...d, status } : d)));

  return (
    <AppShell title={ep.name} subtitle={ep.url}
      actions={
        <Link to="/endpoints" className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface-2 px-3 text-xs font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Back
        </Link>
      }>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Meta label="Status" value={<span className="flex items-center gap-2"><StatusDot status={ep.status} /><span className="capitalize">{ep.status}</span></span>} />
        <Meta label="Method" value={<MethodBadge method={ep.method} />} />
        <Meta label="Interval" value={<span className="text-mono text-sm">{ep.intervalMin} min</span>} />
        <Meta label="Last check" value={<span className="text-mono text-sm">{timeAgo(ep.lastCheckedAt)}</span>} />
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Drift history</h2>
            <span className="text-mono text-[10px] uppercase tracking-widest text-muted-foreground">{logs.length} event{logs.length === 1 ? "" : "s"}</span>
          </div>
        </div>

        <div className="space-y-4">
          {logs.length === 0 && (
            <div className="rounded-lg border border-border/60 bg-surface-2/40 px-4 py-10 text-center text-sm text-muted-foreground">
              No drift detected. Baseline holds.
            </div>
          )}
          {logs.map((d) => (
            <article key={d.id} className="overflow-hidden rounded-lg border border-border/60 bg-surface-2/40">
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
                <div className="flex items-center gap-3">
                  <SeverityBadge severity={d.severity} />
                  <span className="text-mono text-[11px] text-muted-foreground">{new Date(d.detectedAt).toLocaleString()}</span>
                  <StatusPill status={d.status} />
                </div>
                <div className="flex items-center gap-2">
                  <button disabled={d.status !== "unacknowledged"} onClick={() => update(d.id, "acknowledged")}
                    className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-surface-2 px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40">
                    <Check className="size-3" /> Acknowledge
                  </button>
                  <button disabled={d.status === "resolved"} onClick={() => update(d.id, "resolved")}
                    className="inline-flex h-7 items-center gap-1 rounded-md border border-brand/30 bg-brand/10 px-2 text-[11px] font-medium text-brand transition-colors hover:bg-brand/20 disabled:opacity-40">
                    <RefreshCcw className="size-3" /> Resolve & Reset Baseline
                  </button>
                </div>
              </header>
              <div className="px-4 py-3 text-mono text-xs text-muted-foreground">{d.summary}</div>
              <div className="overflow-x-auto border-t border-border/60">
                <table className="w-full text-sm">
                  <thead className="text-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    <tr className="border-b border-border/60">
                      <th className="px-4 py-2 text-left font-medium">Change</th>
                      <th className="px-4 py-2 text-left font-medium">Field</th>
                      <th className="px-4 py-2 text-left font-medium">Baseline type</th>
                      <th className="px-4 py-2 text-left font-medium">Live type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.diff.map((row, i) => (
                      <tr key={i} className="border-b border-border/40 last:border-0">
                        <td className="px-4 py-2.5"><ChangePill type={row.changeType} /></td>
                        <td className="text-mono px-4 py-2.5 text-xs">{row.field}</td>
                        <td className="text-mono px-4 py-2.5 text-xs text-muted-foreground">{row.baselineType}</td>
                        <td className="text-mono px-4 py-2.5 text-xs text-foreground">{row.liveType}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/60 bg-surface-2/40 p-4">
      <div className="text-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-2">{value}</div>
    </div>
  );
}

function ChangePill({ type }: { type: ChangeType }) {
  const cfg = {
    REMOVED: { c: "text-danger bg-danger/10 border-danger/20", I: Minus, label: "REMOVED" },
    ADDED: { c: "text-brand bg-brand/10 border-brand/20", I: Plus, label: "ADDED" },
    TYPE_CHANGED: { c: "text-amber-300 bg-amber-500/10 border-amber-500/20", I: ArrowRightLeft, label: "TYPE CHANGED" },
  }[type];
  const Icon = cfg.I;
  return (
    <span className={`text-mono inline-flex h-5 items-center gap-1 rounded border px-1.5 text-[10px] font-semibold tracking-wider ${cfg.c}`}>
      <Icon className="size-3" /> {cfg.label}
    </span>
  );
}

function StatusPill({ status }: { status: DriftLog["status"] }) {
  const cfg = {
    unacknowledged: "text-danger bg-danger/10 border-danger/20",
    acknowledged: "text-amber-300 bg-amber-500/10 border-amber-500/20",
    resolved: "text-brand bg-brand/10 border-brand/20",
  }[status];
  return <span className={`text-mono inline-flex h-5 items-center rounded border px-1.5 text-[10px] font-semibold uppercase tracking-wider ${cfg}`}>{status}</span>;
}
