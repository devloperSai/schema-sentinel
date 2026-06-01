import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Pause, Play, Trash2, ExternalLink, Pencil, FolderTree } from "lucide-react";
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

  const visible = filterCol === "all" ? endpoints : endpoints.filter((e) => e.collectionId === filterCol);
  const colName = (id: string | null) => collections.find((c) => c.id === id)?.name ?? "—";

  return (
    <AppShell title="Endpoints" subtitle="Register and monitor APIs for schema drift"
      actions={
        <Link to="/endpoints/new" className="inline-flex h-8 items-center gap-1.5 rounded-md bg-foreground px-3 text-xs font-semibold text-background hover:bg-white">
          <Plus className="size-3.5" /> New endpoint
        </Link>
      }>
      <EndpointsWorkspace>
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
      <div className="mb-4 flex items-center gap-2">
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
