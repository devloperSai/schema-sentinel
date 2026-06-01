import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useMemo, useState, type MouseEvent } from "react";
import {
  ChevronRight, FolderPlus, Plus, Search, Folder, FolderOpen, MoreHorizontal,
  LayoutDashboard, Bell, Globe2, Trash2, Pencil, FilePlus2,
} from "lucide-react";
import { StatusDot, MethodBadge } from "@/components/app/AppShell";
import { useStore, store, type Collection, type EndpointConfig } from "@/lib/store";
import { mockDrifts } from "@/lib/mock";

type CtxMenu = { x: number; y: number; nodeKind: "collection" | "endpoint" | "root"; id: string | null } | null;

export function CollectionsSidebar() {
  const collections = useStore((s) => s.collections);
  const endpoints = useStore((s) => s.endpoints);
  const [q, setQ] = useState("");
  const [ctx, setCtx] = useState<CtxMenu>(null);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const unack = mockDrifts.filter((d) => d.status === "unacknowledged").length;

  const filtered = useMemo(() => {
    if (!q.trim()) return null;
    const needle = q.toLowerCase();
    const matchedEpIds = new Set(endpoints.filter((e) =>
      e.name.toLowerCase().includes(needle) || e.url.toLowerCase().includes(needle)
    ).map((e) => e.id));
    const matchedColIds = new Set(collections.filter((c) => c.name.toLowerCase().includes(needle)).map((c) => c.id));
    // Walk parents for matched eps/cols so tree path stays visible
    const keepCols = new Set<string>([...matchedColIds]);
    const byId = new Map(collections.map((c) => [c.id, c]));
    for (const ep of endpoints) if (matchedEpIds.has(ep.id) && ep.collectionId) keepCols.add(ep.collectionId);
    for (const id of [...keepCols]) {
      let p = byId.get(id)?.parentId ?? null;
      while (p) { keepCols.add(p); p = byId.get(p)?.parentId ?? null; }
    }
    return { matchedEpIds, keepCols };
  }, [q, collections, endpoints]);

  const roots = collections.filter((c) => c.parentId === null);
  const orphans = endpoints.filter((e) => !e.collectionId);

  const onContext = (e: MouseEvent, nodeKind: "collection" | "endpoint" | "root", id: string | null) => {
    e.preventDefault();
    setCtx({ x: e.clientX, y: e.clientY, nodeKind, id });
  };

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border/60 bg-surface-2/30">
      {/* Search */}
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search collections, endpoints"
            className="text-mono h-7 w-full rounded-md border border-border bg-surface-2/60 pl-7 pr-2 text-[11px] outline-none placeholder:text-muted-foreground/60 focus:border-brand/50"
          />
        </div>
        <button
          onClick={() => store.addCollection(null)}
          aria-label="New collection"
          title="New collection"
          className="grid size-7 place-items-center rounded-md border border-border bg-surface-2 text-muted-foreground hover:text-foreground"
        >
          <FolderPlus className="size-3.5" />
        </button>
      </div>

      {/* Tree */}
      <div
        className="flex-1 overflow-y-auto px-1.5 py-2 text-sm"
        onContextMenu={(e) => onContext(e, "root", null)}
        onClick={() => setCtx(null)}
      >
        {roots.map((c) => (
          <TreeNode
            key={c.id} col={c} depth={0}
            collections={collections} endpoints={endpoints}
            filtered={filtered}
            onContext={onContext}
            currentPath={pathname}
          />
        ))}

        {orphans.length > 0 && (
          <div className="mt-3 border-t border-border/40 pt-2">
            <div className="text-mono px-2 py-1 text-[10px] uppercase tracking-widest text-muted-foreground">Unassigned</div>
            {orphans
              .filter((e) => !filtered || filtered.matchedEpIds.has(e.id))
              .map((e) => <EndpointItem key={e.id} ep={e} depth={0} active={pathname.includes(e.id)} onContext={onContext} />)}
          </div>
        )}

        {filtered && roots.every((c) => !filtered.keepCols.has(c.id)) && orphans.every((e) => !filtered.matchedEpIds.has(e.id)) && (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">No matches for "{q}"</p>
        )}
      </div>

      {/* Bottom nav */}
      <div className="border-t border-border/60 p-2">
        <NavBtn to="/dashboard" icon={LayoutDashboard} label="Dashboard" active={pathname === "/dashboard"} />
        <NavBtn to="/alerts" icon={Bell} label="Alerts" active={pathname === "/alerts"} badge={unack || undefined} />
        <NavBtn to="/environments" icon={Globe2} label="Environments" active={pathname === "/environments"} />
      </div>

      {/* Context menu */}
      {ctx && (
        <div
          className="fixed z-50 w-48 overflow-hidden rounded-md border border-border bg-popover shadow-elevated animate-fade-in"
          style={{ top: ctx.y, left: ctx.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {ctx.nodeKind === "collection" && ctx.id && (
            <>
              <CtxItem icon={FilePlus2} label="New endpoint here" onClick={() => {
                const ep = store.newEndpointTemplate(ctx.id);
                store.upsertEndpoint(ep); setCtx(null);
                navigate({ to: "/endpoints/$id/edit", params: { id: ep.id } });
              }} />
              <CtxItem icon={FolderPlus} label="New sub-collection" onClick={() => { store.addCollection(ctx.id); setCtx(null); }} />
              <CtxItem icon={Pencil} label="Rename" onClick={() => {
                const name = prompt("Rename collection", collections.find((c) => c.id === ctx.id)?.name ?? "");
                if (name) store.renameCollection(ctx.id!, name);
                setCtx(null);
              }} />
              <CtxItem icon={Trash2} danger label="Delete" onClick={() => {
                if (confirm("Delete this collection and its sub-collections?")) store.deleteCollection(ctx.id!);
                setCtx(null);
              }} />
            </>
          )}
          {ctx.nodeKind === "endpoint" && ctx.id && (
            <>
              <CtxItem icon={Pencil} label="Edit" onClick={() => { navigate({ to: "/endpoints/$id/edit", params: { id: ctx.id! } }); setCtx(null); }} />
              <CtxItem icon={Trash2} danger label="Delete" onClick={() => { store.deleteEndpoint(ctx.id!); setCtx(null); }} />
            </>
          )}
          {ctx.nodeKind === "root" && (
            <CtxItem icon={FolderPlus} label="New collection" onClick={() => { store.addCollection(null); setCtx(null); }} />
          )}
        </div>
      )}
    </aside>
  );
}

function NavBtn({ to, icon: Icon, label, active, badge }: {
  to: string; icon: React.ComponentType<{ className?: string }>; label: string; active: boolean; badge?: number;
}) {
  return (
    <Link to={to}
      className={`flex h-8 items-center gap-2.5 rounded-md px-2 text-xs font-medium transition-colors ${
        active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
      }`}>
      <Icon className="size-3.5" />
      <span>{label}</span>
      {badge !== undefined && (
        <span className="ml-auto inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">{badge}</span>
      )}
    </Link>
  );
}

function CtxItem({ icon: Icon, label, onClick, danger }: {
  icon: React.ComponentType<{ className?: string }>; label: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-accent ${danger ? "text-danger" : "text-foreground"}`}>
      <Icon className="size-3.5" />{label}
    </button>
  );
}

function TreeNode({ col, depth, collections, endpoints, filtered, onContext, currentPath }: {
  col: Collection;
  depth: number;
  collections: Collection[];
  endpoints: EndpointConfig[];
  filtered: { matchedEpIds: Set<string>; keepCols: Set<string> } | null;
  onContext: (e: MouseEvent, kind: "collection" | "endpoint", id: string) => void;
  currentPath: string;
}) {
  if (filtered && !filtered.keepCols.has(col.id)) return null;

  const children = collections.filter((c) => c.parentId === col.id);
  const ownEps = endpoints.filter((e) => e.collectionId === col.id);
  const visibleEps = filtered ? ownEps.filter((e) => filtered.matchedEpIds.has(e.id)) : ownEps;
  const isOpen = filtered ? true : col.expanded;
  const indent = depth * 12;

  return (
    <div>
      <div
        role="button"
        onClick={() => store.toggleCollection(col.id)}
        onContextMenu={(e) => onContext(e, "collection", col.id)}
        style={{ paddingLeft: 6 + indent }}
        className="group flex h-7 cursor-pointer items-center gap-1.5 rounded-md pr-2 text-xs font-medium text-foreground/90 hover:bg-accent/40"
      >
        <ChevronRight className={`size-3 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`} />
        {isOpen ? <FolderOpen className="size-3.5 text-brand/80" /> : <Folder className="size-3.5 text-muted-foreground" />}
        <span className="truncate">{col.name}</span>
        <span className="text-mono ml-auto text-[10px] text-muted-foreground/70">{ownEps.length}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onContext(e, "collection", col.id); }}
          className="invisible grid size-5 place-items-center rounded text-muted-foreground hover:bg-accent group-hover:visible"
          aria-label="Menu">
          <MoreHorizontal className="size-3" />
        </button>
      </div>

      {isOpen && (
        <>
          {children.map((c) => (
            <TreeNode key={c.id} col={c} depth={depth + 1} collections={collections} endpoints={endpoints}
              filtered={filtered} onContext={onContext} currentPath={currentPath} />
          ))}
          {visibleEps.map((ep) => (
            <EndpointItem key={ep.id} ep={ep} depth={depth + 1} active={currentPath.includes(ep.id)} onContext={onContext} />
          ))}
        </>
      )}
    </div>
  );
}

function EndpointItem({ ep, depth, active, onContext }: {
  ep: EndpointConfig;
  depth: number;
  active: boolean;
  onContext: (e: MouseEvent, kind: "endpoint", id: string) => void;
}) {
  return (
    <Link
      to="/endpoints/$id" params={{ id: ep.id }}
      onContextMenu={(e) => onContext(e, "endpoint", ep.id)}
      style={{ paddingLeft: 18 + depth * 12 }}
      className={`flex h-7 items-center gap-1.5 rounded-md pr-2 text-xs transition-colors ${
        active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
      }`}
    >
      <MethodBadge method={ep.method} />
      <span className="truncate">{ep.name}</span>
      <span className="ml-auto"><StatusDot status={ep.status} /></span>
    </Link>
  );
}
