import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Plus, Pause, Play, Trash2, ExternalLink, Pencil, FolderTree,
  Zap, FolderPlus, Download, BookOpen, Sparkles, ArrowRight,
} from "lucide-react";
import { AppShell, StatusDot, MethodBadge } from "@/components/app/AppShell";
import { EndpointsWorkspace } from "@/components/app/EndpointsWorkspace";
import { timeAgo } from "@/lib/mock";
import { useStore, store } from "@/lib/store";

export const Route = createFileRoute("/_app/endpoints")({
  head: () => ({ meta: [{ title: "Endpoints — SchemaGuard" }] }),
  component: EndpointsPage,
});

function EndpointsPage() {
  const endpoints = useStore((s) => s.endpoints);
  const collections = useStore((s) => s.collections);
  const [filterCol, setFilterCol] = useState<string | "all">("all");
  const navigate = useNavigate();

  const visible = filterCol === "all" ? endpoints : endpoints.filter((e) => e.collectionId === filterCol);
  const colName = (id: string | null) => collections.find((c) => c.id === id)?.name ?? "—";

  const createEndpoint = () => {
    const ep = store.newEndpointTemplate(null);
    store.upsertEndpoint(ep);
    navigate({ to: "/endpoints/$id/edit", params: { id: ep.id } });
  };

  return (
    <AppShell title="Endpoints" subtitle="Register and monitor APIs for schema drift"
      actions={
        <button onClick={createEndpoint}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-foreground px-3 text-xs font-semibold text-background hover:bg-white">
          <Plus className="size-3.5" /> New endpoint
        </button>
      }>
      <EndpointsWorkspace>
        {/* Postman-style "Scratchpad" welcome */}
        <Scratchpad
          endpointsCount={endpoints.length}
          collectionsCount={collections.length}
          onCreateEndpoint={createEndpoint}
          onCreateCollection={() => store.addCollection(null)}
        />

        <ListView
          endpoints={visible}
          filterCol={filterCol}
          setFilterCol={setFilterCol}
          collections={collections}
          colName={colName}
        />
      </EndpointsWorkspace>
    </AppShell>
  );
}

function Scratchpad({
  endpointsCount, collectionsCount, onCreateEndpoint, onCreateCollection,
}: {
  endpointsCount: number; collectionsCount: number;
  onCreateEndpoint: () => void; onCreateCollection: () => void;
}) {
  return (
    <section className="mb-6 overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-surface-2/60 via-surface-2/30 to-transparent">
      <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
        <div>
          <div className="text-mono flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
            <Sparkles className="size-3 text-brand" /> Workspace
          </div>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">Start a new request</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Build endpoints, group them in collections, and SchemaGuard watches for drift on every poll.
          </p>
        </div>
        <div className="text-mono hidden gap-4 text-right text-[10px] uppercase tracking-widest text-muted-foreground sm:flex">
          <div><div className="text-base font-semibold text-foreground">{endpointsCount}</div>endpoints</div>
          <div><div className="text-base font-semibold text-foreground">{collectionsCount}</div>collections</div>
        </div>
      </div>

      <div className="grid gap-px bg-border/60 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          icon={Zap}
          accent="text-brand"
          title="New endpoint"
          hint="Build a request and arm drift checks"
          onClick={onCreateEndpoint}
          cta="Open builder"
        />
        <Tile
          icon={FolderPlus}
          accent="text-amber-300"
          title="New collection"
          hint="Group endpoints by service or team"
          onClick={onCreateCollection}
          cta="Create"
        />
        <Tile
          icon={Download}
          accent="text-violet-300"
          title="Import"
          hint="OpenAPI / Postman / cURL (coming soon)"
          disabled
          cta="Soon"
        />
        <Tile
          icon={BookOpen}
          accent="text-emerald-300"
          title="Docs"
          hint="Drift detection & baseline guide"
          to="/"
          cta="Read"
        />
      </div>
    </section>
  );
}

function Tile({
  icon: Icon, accent, title, hint, cta, onClick, to, disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  accent: string; title: string; hint: string; cta: string;
  onClick?: () => void; to?: string; disabled?: boolean;
}) {
  const inner = (
    <div className={`group relative flex h-full flex-col gap-2 bg-surface-2/40 px-4 py-4 text-left transition-colors ${disabled ? "opacity-60" : "hover:bg-surface-2/70"}`}>
      <div className="flex items-center gap-2">
        <Icon className={`size-4 ${accent}`} />
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <p className="text-[11px] text-muted-foreground">{hint}</p>
      <div className="text-mono mt-1 inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground group-hover:text-foreground">
        {cta} <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
      </div>
    </div>
  );
  if (to && !disabled) return <Link to={to} className="block">{inner}</Link>;
  return (
    <button type="button" disabled={disabled} onClick={onClick} className="block text-left disabled:cursor-not-allowed">
      {inner}
    </button>
  );
}

function ListView({
  endpoints, filterCol, setFilterCol, collections, colName,
}: {
  endpoints: ReturnType<typeof useStore<typeof import("@/lib/store").store extends never ? never : any>>;
  filterCol: string;
  setFilterCol: (v: string) => void;
  collections: Array<{ id: string; name: string }>;
  colName: (id: string | null) => string;
}) {
  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold tracking-tight">All endpoints</h3>
          <span className="text-mono rounded border border-border/60 bg-surface-2/40 px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
            {endpoints.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <FolderTree className="size-3.5 text-muted-foreground" />
          <span className="text-mono text-[10px] uppercase tracking-widest text-muted-foreground">Collection</span>
          <select
            value={filterCol}
            onChange={(e) => setFilterCol(e.target.value)}
            className="text-mono h-7 rounded-md border border-border bg-surface-2/60 px-2 text-[11px] outline-none focus:border-brand/50"
          >
            <option value="all">All</option>
            {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border/60 bg-surface-2/40">
        <table className="w-full text-sm">
          <thead className="text-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <tr className="border-b border-border/60">
              <th className="px-4 py-2.5 text-left font-medium">Status</th>
              <th className="px-4 py-2.5 text-left font-medium">Endpoint</th>
              <th className="px-4 py-2.5 text-left font-medium">Method</th>
              <th className="px-4 py-2.5 text-left font-medium">Collection</th>
              <th className="px-4 py-2.5 text-left font-medium">Interval</th>
              <th className="px-4 py-2.5 text-left font-medium">Last check</th>
              <th className="px-4 py-2.5 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {endpoints.map((e: any) => (
              <tr key={e.id} className="border-b border-border/40 last:border-0 transition-colors hover:bg-accent/30">
                <td className="px-4 py-3"><StatusDot status={e.status} /></td>
                <td className="px-4 py-3">
                  <div className="font-medium">{e.name}</div>
                  <div className="text-mono truncate text-[11px] text-muted-foreground">{e.url}</div>
                </td>
                <td className="px-4 py-3"><MethodBadge method={e.method} /></td>
                <td className="text-mono px-4 py-3 text-[11px] text-muted-foreground">{colName(e.collectionId)}</td>
                <td className="text-mono px-4 py-3 text-[11px] text-muted-foreground">{e.intervalMin}m</td>
                <td className="text-mono px-4 py-3 text-[11px] text-muted-foreground">{timeAgo(e.lastCheckedAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Link to="/endpoints/$id" params={{ id: e.id }}
                      className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-surface-2 px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground">
                      <ExternalLink className="size-3" /> Details
                    </Link>
                    <Link to="/endpoints/$id/edit" params={{ id: e.id }}
                      className="grid size-7 place-items-center rounded-md border border-border bg-surface-2 text-muted-foreground transition-colors hover:text-foreground" aria-label="Edit">
                      <Pencil className="size-3" />
                    </Link>
                    <button onClick={() => store.toggleEndpointStatus(e.id)}
                      className="grid size-7 place-items-center rounded-md border border-border bg-surface-2 text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={e.status === "paused" ? "Resume" : "Pause"}>
                      {e.status === "paused" ? <Play className="size-3" /> : <Pause className="size-3" />}
                    </button>
                    <button onClick={() => store.deleteEndpoint(e.id)}
                      className="grid size-7 place-items-center rounded-md border border-border bg-surface-2 text-muted-foreground transition-colors hover:border-danger/40 hover:text-danger"
                      aria-label="Delete">
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {endpoints.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">No endpoints in this view.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
