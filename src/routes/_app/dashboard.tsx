import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, CheckCircle2, AlertTriangle, BellRing, ArrowUpRight, Plus,
  Zap, Clock, TrendingUp, TrendingDown, Radio, Cpu, ShieldCheck, GitBranch,
} from "lucide-react";
import { AppShell, StatusDot, MethodBadge, SeverityBadge } from "@/components/app/AppShell";
import { mockEndpoints, mockDrifts, timeAgo, type DriftLog, type Severity } from "@/lib/mock";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — SchemaGuard" }] }),
  component: DashboardPage,
});

// ─── Live ticker simulation ───────────────────────────────────────────────
type FeedEvent = { id: string; kind: "check" | "drift" | "fallback" | "baseline"; endpoint: string; detail: string; t: number };

const seedFeed: FeedEvent[] = [
  { id: "f1", kind: "drift",    endpoint: "ep_1", detail: "TYPE_CHANGED · customer.tier",      t: Date.now() - 14_000 },
  { id: "f2", kind: "check",    endpoint: "ep_2", detail: "200 · schema match · 84ms",          t: Date.now() - 28_000 },
  { id: "f3", kind: "fallback", endpoint: "ep_4", detail: "served last_known_good · 12ms",      t: Date.now() - 41_000 },
  { id: "f4", kind: "check",    endpoint: "ep_3", detail: "200 · schema match · 132ms",         t: Date.now() - 58_000 },
  { id: "f5", kind: "baseline", endpoint: "ep_6", detail: "baseline accepted · v1.4.2",         t: Date.now() - 80_000 },
];

function DashboardPage() {
  const [feed, setFeed] = useState<FeedEvent[]>(seedFeed);
  const [tick, setTick] = useState(0);
  const counter = useRef(100);

  useEffect(() => {
    const i = setInterval(() => {
      counter.current += 1;
      const pool: Array<Omit<FeedEvent, "id" | "t">> = [
        { kind: "check",    endpoint: "ep_3", detail: "200 · schema match · 96ms" },
        { kind: "check",    endpoint: "ep_2", detail: "200 · schema match · 71ms" },
        { kind: "drift",    endpoint: "ep_1", detail: "TYPE_CHANGED · currency → object" },
        { kind: "fallback", endpoint: "ep_4", detail: "served last_known_good · 9ms" },
        { kind: "check",    endpoint: "ep_6", detail: "200 · schema match · 110ms" },
      ];
      const next = pool[counter.current % pool.length];
      setFeed((prev) => [{ ...next, id: `f${counter.current}`, t: Date.now() }, ...prev].slice(0, 8));
      setTick((t) => t + 1);
    }, 4500);
    return () => clearInterval(i);
  }, []);

  const stats = useMemo(() => {
    const total = mockEndpoints.length;
    const healthy = mockEndpoints.filter((e) => e.status === "healthy").length;
    const drifted = mockEndpoints.filter((e) => e.status === "drifted").length;
    const unack = mockDrifts.filter((d) => d.status === "unacknowledged").length;
    return { total, healthy, drifted, unack };
  }, []);

  const sla = ((stats.healthy / Math.max(stats.total - mockEndpoints.filter(e=>e.status==="paused").length, 1)) * 100);
  const requests24h = 18_472 + (tick * 3);
  const driftRate = ((mockDrifts.length / requests24h) * 100);

  const recent = [...mockDrifts]
    .sort((a, b) => +new Date(b.detectedAt) - +new Date(a.detectedAt))
    .slice(0, 4);

  const sevCounts = mockDrifts.reduce<Record<Severity, number>>(
    (acc, d) => ({ ...acc, [d.severity]: (acc[d.severity] ?? 0) + 1 }),
    { low: 0, medium: 0, high: 0, critical: 0 },
  );

  return (
    <AppShell
      title="Dashboard"
      subtitle="Real-time API integrity & schema drift monitoring"
      actions={
        <>
          <span className="text-mono hidden items-center gap-1.5 rounded-md border border-border/60 bg-surface-2/40 px-2.5 py-1 text-[10px] uppercase tracking-widest text-muted-foreground sm:inline-flex">
            <span className="size-1.5 rounded-full bg-brand animate-pulse-soft" /> live
          </span>
          <Link to="/endpoints" className="inline-flex h-8 items-center gap-1.5 rounded-md bg-foreground px-3 text-xs font-semibold text-background transition-colors hover:bg-white">
            <Plus className="size-3.5" /> Add endpoint
          </Link>
        </>
      }
    >
      {/* ── Hero status bar ─────────────────────────────────────────── */}
      <section className="relative mb-6 overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-surface-2/80 via-surface-2/30 to-transparent p-5">
        <div className="absolute inset-0 grid-bg opacity-30 [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_70%)]" />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative grid size-12 place-items-center rounded-lg border border-brand/30 bg-brand/10">
              <ShieldCheck className="size-5 text-brand" />
              <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-brand shadow-[0_0_10px] shadow-brand animate-pulse-soft" />
            </div>
            <div>
              <div className="text-mono text-[10px] uppercase tracking-widest text-muted-foreground">System status</div>
              <div className="mt-0.5 flex items-baseline gap-2">
                <span className="text-xl font-semibold tracking-tight">
                  {stats.drifted > 0 ? "Drift detected" : "All systems nominal"}
                </span>
                <span className="text-mono text-[11px] text-muted-foreground">
                  · proxy.region=eu-west-1 · {requests24h.toLocaleString()} req/24h
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <Metric label="SLA (7d)" value={`${sla.toFixed(2)}%`} trend="up" />
            <Metric label="Avg latency" value="94ms" trend="down" sub="-6ms" />
            <Metric label="Drift rate" value={`${driftRate.toFixed(3)}%`} trend="up" warn />
          </div>
        </div>
      </section>

      {/* ── KPI cards with sparklines ───────────────────────────────── */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Activity}      label="Total Endpoints" value={stats.total}   hint="across all envs"  spark={[3,4,4,5,5,6,6]} />
        <StatCard icon={CheckCircle2}  label="Healthy"         value={stats.healthy} hint="baseline matched" accent="brand"  spark={[4,4,3,4,3,3,3]} />
        <StatCard icon={AlertTriangle} label="Drifted"         value={stats.drifted} hint="schema mismatch"  accent="danger" spark={[0,1,1,2,1,2,2]} />
        <StatCard icon={BellRing}      label="Unacknowledged"  value={stats.unack}   hint="needs attention"  accent="amber"  spark={[1,1,2,2,3,2,2]} />
      </section>

      {/* ── Main grid: feed + throughput + severity ─────────────────── */}
      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        {/* Live event feed */}
        <Panel
          title="Live event stream"
          icon={Radio}
          hint="socket.io · drift_alert"
          className="lg:col-span-2"
        >
          <ul className="divide-y divide-border/40">
            {feed.map((e) => (
              <li key={e.id} className="flex items-center gap-3 px-4 py-2.5 transition-colors animate-fade-in hover:bg-accent/30">
                <FeedKindIcon kind={e.kind} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-mono text-[11px] font-medium">{e.endpoint}</span>
                    <span className="text-mono text-[10px] uppercase tracking-widest text-muted-foreground">{e.kind}</span>
                  </div>
                  <div className="text-mono mt-0.5 truncate text-[11px] text-muted-foreground">{e.detail}</div>
                </div>
                <span className="text-mono shrink-0 text-[10px] text-muted-foreground/70">{relSecs(e.t)}</span>
              </li>
            ))}
          </ul>
        </Panel>

        {/* Severity donut */}
        <Panel title="Drift severity" icon={GitBranch} hint={`${mockDrifts.length} total`}>
          <div className="flex items-center gap-5 p-5">
            <SeverityDonut counts={sevCounts} />
            <ul className="flex-1 space-y-2 text-xs">
              {(["critical", "high", "medium", "low"] as Severity[]).map((s) => (
                <li key={s} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2">
                    <span className={`size-2 rounded-full ${sevDot(s)}`} />
                    <span className="capitalize text-muted-foreground">{s}</span>
                  </span>
                  <span className="text-mono tabular-nums">{sevCounts[s]}</span>
                </li>
              ))}
            </ul>
          </div>
        </Panel>
      </section>

      {/* ── Throughput chart ────────────────────────────────────────── */}
      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Request throughput (24h)" icon={Cpu} hint="proxied · per hour" className="lg:col-span-2">
          <div className="px-2 pb-2 pt-4">
            <ThroughputChart />
            <div className="text-mono mt-2 flex justify-between px-2 text-[10px] text-muted-foreground">
              <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>now</span>
            </div>
          </div>
        </Panel>

        {/* Quick actions */}
        <Panel title="Quick actions" icon={Zap} hint="shortcuts">
          <div className="space-y-1.5 p-3">
            <QuickLink to="/endpoints"  label="Add new endpoint"  shortcut="N"  icon={Plus} />
            <QuickLink to="/alerts"     label="Triage alerts"     shortcut="A"  icon={BellRing} />
            <QuickLink to="/endpoints"  label="Browse endpoints"  shortcut="E"  icon={Network} />
            <QuickLink to="/alerts"     label="Acknowledge all"   shortcut="⌘K" icon={CheckCircle2} />
          </div>
        </Panel>
      </section>

      {/* ── Endpoints + Recent drifts ───────────────────────────────── */}
      <section className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PanelHeader
            title="Monitored endpoints"
            hint={`${mockEndpoints.length} total`}
            action={<Link to="/endpoints" className="text-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground">manage →</Link>}
          />
          <div className="overflow-hidden rounded-lg border border-border/60 bg-surface-2/40">
            <table className="w-full text-sm">
              <thead className="text-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr className="border-b border-border/60">
                  <th className="px-4 py-2.5 text-left font-medium">Status</th>
                  <th className="px-4 py-2.5 text-left font-medium">Endpoint</th>
                  <th className="px-4 py-2.5 text-left font-medium">Method</th>
                  <th className="px-4 py-2.5 text-left font-medium">Drift (24h)</th>
                  <th className="px-4 py-2.5 text-right font-medium">Last check</th>
                </tr>
              </thead>
              <tbody>
                {mockEndpoints.map((e, idx) => (
                  <tr key={e.id} className="group border-b border-border/40 last:border-0 transition-colors hover:bg-accent/30">
                    <td className="px-4 py-3"><StatusDot status={e.status} /></td>
                    <td className="px-4 py-3">
                      <Link to="/endpoints/$id" params={{ id: e.id }} className="font-medium transition-colors group-hover:text-brand">{e.name}</Link>
                      <div className="text-mono truncate text-[11px] text-muted-foreground">{e.url}</div>
                    </td>
                    <td className="px-4 py-3"><MethodBadge method={e.method} /></td>
                    <td className="px-4 py-3">
                      <MiniSpark
                        data={rowSparkData(idx, e.driftCount)}
                        color={e.status === "drifted" ? "var(--danger)" : "var(--brand)"}
                      />
                    </td>
                    <td className="text-mono px-4 py-3 text-right text-[11px] text-muted-foreground">{timeAgo(e.lastCheckedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <PanelHeader
            title="Recent drift events"
            hint="last 4"
            action={<Link to="/alerts" className="text-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground">all →</Link>}
          />
          <div className="space-y-2">
            {recent.map((d) => <RecentDriftItem key={d.id} drift={d} />)}
          </div>
        </div>
      </section>
    </AppShell>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────────
import { Network } from "lucide-react";

function Metric({ label, value, trend, sub, warn }: { label: string; value: string; trend: "up" | "down"; sub?: string; warn?: boolean }) {
  const Arrow = trend === "up" ? TrendingUp : TrendingDown;
  const color = warn ? "text-amber-300" : trend === "up" ? "text-brand" : "text-brand";
  return (
    <div className="text-right">
      <div className="text-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-0.5 flex items-baseline justify-end gap-1.5">
        <span className="text-lg font-semibold tabular-nums">{value}</span>
        <span className={`inline-flex items-center gap-0.5 text-[10px] ${color}`}>
          <Arrow className="size-3" />{sub ?? ""}
        </span>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, hint, accent, spark }: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: number; hint: string;
  accent?: "brand" | "danger" | "amber"; spark: number[];
}) {
  const accentClass = {
    brand:  "text-brand bg-brand/10 border-brand/20",
    danger: "text-danger bg-danger/10 border-danger/20",
    amber:  "text-amber-300 bg-amber-500/10 border-amber-500/20",
  }[accent ?? "brand"];
  const sparkColor = accent === "danger" ? "var(--danger)" : accent === "amber" ? "oklch(0.82 0.16 80)" : "var(--brand)";
  return (
    <div className="group relative overflow-hidden rounded-lg border border-border/60 bg-surface-2/40 p-4 transition-all hover:-translate-y-0.5 hover:border-border hover:shadow-elevated">
      <div className="flex items-start justify-between">
        <div className={`grid size-8 place-items-center rounded-md border ${accent ? accentClass : "border-border bg-accent text-muted-foreground"}`}>
          <Icon className="size-4" />
        </div>
        <ArrowUpRight className="size-4 text-muted-foreground/40 transition-colors group-hover:text-foreground" />
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <div>
          <div className="text-3xl font-semibold tracking-tight tabular-nums">{value}</div>
          <div className="text-mono mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground/70">{hint}</div>
        </div>
        <MiniSpark data={spark} color={sparkColor} w={72} h={28} />
      </div>
    </div>
  );
}

function Panel({ title, icon: Icon, hint, children, className }: {
  title: string; icon: React.ComponentType<{ className?: string }>; hint?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`overflow-hidden rounded-lg border border-border/60 bg-surface-2/40 ${className ?? ""}`}>
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Icon className="size-3.5 text-muted-foreground" />
          <h2 className="text-xs font-semibold tracking-tight">{title}</h2>
        </div>
        {hint && <span className="text-mono text-[10px] uppercase tracking-widest text-muted-foreground">{hint}</span>}
      </div>
      {children}
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

function FeedKindIcon({ kind }: { kind: FeedEvent["kind"] }) {
  const cfg = {
    check:    { Icon: CheckCircle2,  cls: "text-brand bg-brand/10 border-brand/20" },
    drift:    { Icon: AlertTriangle, cls: "text-danger bg-danger/10 border-danger/20" },
    fallback: { Icon: ShieldCheck,   cls: "text-amber-300 bg-amber-500/10 border-amber-500/20" },
    baseline: { Icon: GitBranch,     cls: "text-sky-300 bg-sky-500/10 border-sky-500/20" },
  }[kind];
  return (
    <div className={`grid size-6 shrink-0 place-items-center rounded border ${cfg.cls}`}>
      <cfg.Icon className="size-3" />
    </div>
  );
}

function QuickLink({ to, label, shortcut, icon: Icon }: { to: string; label: string; shortcut: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent">
      <Icon className="size-4 text-muted-foreground" />
      <span className="flex-1">{label}</span>
      <kbd className="text-mono rounded border border-border bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted-foreground">{shortcut}</kbd>
    </Link>
  );
}

function RecentDriftItem({ drift }: { drift: DriftLog }) {
  return (
    <Link
      to="/endpoints/$id"
      params={{ id: drift.endpointId }}
      className="group block rounded-lg border border-border/60 bg-surface-2/40 p-3 transition-all hover:-translate-y-0.5 hover:border-border hover:bg-surface-2/70"
    >
      <div className="flex items-center justify-between gap-2">
        <SeverityBadge severity={drift.severity} />
        <span className="text-mono flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="size-3" />{timeAgo(drift.detectedAt)}
        </span>
      </div>
      <div className="mt-2 text-xs font-medium transition-colors group-hover:text-brand">{drift.endpointName}</div>
      <div className="text-mono mt-1 truncate text-[11px] text-muted-foreground">{drift.summary}</div>
    </Link>
  );
}

// ─── Charts (pure SVG) ───────────────────────────────────────────────────
function MiniSpark({ data, color, w = 80, h = 24 }: { data: number[]; color: string; w?: number; h?: number }) {
  const max = Math.max(...data, 1);
  const step = w / Math.max(data.length - 1, 1);
  const pts = data.map((v, i) => `${i * step},${h - (v / max) * (h - 4) - 2}`).join(" ");
  const area = `0,${h} ${pts} ${w},${h}`;
  const gid = `g-${color.replace(/[^a-z0-9]/gi, "")}-${data.join("")}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gid})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ThroughputChart() {
  // 24 buckets
  const data = [120, 110, 95, 88, 92, 105, 140, 220, 310, 380, 420, 450, 470, 460, 440, 420, 390, 360, 330, 290, 240, 200, 170, 150];
  const drift = [0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 2, 1, 0, 0, 3, 1, 0, 0, 0, 1, 0, 0, 0, 2];
  const w = 600, h = 140, pad = 8;
  const max = Math.max(...data);
  const step = (w - pad * 2) / (data.length - 1);
  const pts = data.map((v, i) => `${pad + i * step},${h - (v / max) * (h - 20) - 4}`).join(" ");
  const area = `${pad},${h - 4} ${pts} ${w - pad},${h - 4}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-40 w-full">
      <defs>
        <linearGradient id="throughput" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"   stopColor="var(--brand)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* gridlines */}
      {[0.25, 0.5, 0.75].map((p) => (
        <line key={p} x1={pad} x2={w - pad} y1={h * p} y2={h * p} stroke="var(--border)" strokeDasharray="2 4" />
      ))}
      <polygon points={area} fill="url(#throughput)" />
      <polyline points={pts} fill="none" stroke="var(--brand)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      {/* drift markers */}
      {drift.map((d, i) =>
        d > 0 ? (
          <g key={i}>
            <line x1={pad + i * step} x2={pad + i * step} y1={4} y2={h - 4} stroke="var(--danger)" strokeOpacity="0.15" />
            <circle cx={pad + i * step} cy={h - (data[i] / max) * (h - 20) - 4} r="3" fill="var(--danger)" />
          </g>
        ) : null,
      )}
    </svg>
  );
}

function SeverityDonut({ counts }: { counts: Record<Severity, number> }) {
  const order: Severity[] = ["critical", "high", "medium", "low"];
  const colors: Record<Severity, string> = {
    critical: "oklch(0.66 0.22 16)",
    high:     "oklch(0.72 0.18 50)",
    medium:   "oklch(0.82 0.16 80)",
    low:      "oklch(0.55 0.02 285)",
  };
  const total = Math.max(order.reduce((s, k) => s + counts[k], 0), 1);
  const r = 36, c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="relative grid size-[120px] place-items-center">
      <svg viewBox="0 0 100 100" className="size-[120px] -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--border)" strokeWidth="10" />
        {order.map((k) => {
          const frac = counts[k] / total;
          const len = frac * c;
          const dash = `${len} ${c - len}`;
          const el = (
            <circle key={k} cx="50" cy="50" r={r} fill="none" stroke={colors[k]} strokeWidth="10"
              strokeDasharray={dash} strokeDashoffset={-offset} strokeLinecap="butt" />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="text-xl font-semibold tabular-nums">{total}</div>
          <div className="text-mono text-[9px] uppercase tracking-widest text-muted-foreground">drifts</div>
        </div>
      </div>
    </div>
  );
}

// ─── helpers ─────────────────────────────────────────────────────────────
function sevDot(s: Severity) {
  return {
    critical: "bg-rose-400",
    high:     "bg-orange-400",
    medium:   "bg-amber-300",
    low:      "bg-muted-foreground/60",
  }[s];
}

function rowSparkData(seed: number, drift: number) {
  // deterministic small series, spike where drift exists
  const base = [2, 3, 2, 4, 3, 4, 5, 4, 3, 4, 5, 6];
  return base.map((v, i) => v + ((seed + i) % 3) + (drift > 0 && i > 8 ? drift * 2 : 0));
}

function relSecs(t: number) {
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m`;
}
