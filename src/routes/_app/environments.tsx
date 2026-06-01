import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2, Eye, EyeOff, Check, Globe2 } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { EndpointsWorkspace } from "@/components/app/EndpointsWorkspace";
import { useStore, store } from "@/lib/store";

export const Route = createFileRoute("/_app/environments")({
  head: () => ({ meta: [{ title: "Environments — SchemaGuard" }] }),
  component: EnvironmentsPage,
});

function EnvironmentsPage() {
  const envs = useStore((s) => s.environments);
  const activeId = useStore((s) => s.activeEnvId);
  const [selectedId, setSelectedId] = useState(activeId);
  const selected = envs.find((e) => e.id === selectedId) ?? envs[0];
  const [reveal, setReveal] = useState<Record<string, boolean>>({});

  return (
    <AppShell title="Environments" subtitle="Variables shared across endpoints using {{KEY}} syntax">
      <EndpointsWorkspace>
        <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
          {/* Env list */}
          <div className="rounded-lg border border-border/60 bg-surface-2/40 p-2">
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-mono text-[10px] uppercase tracking-widest text-muted-foreground">All environments</span>
              <button
                onClick={() => {
                  const name = prompt("Environment name", "New env");
                  if (name) setSelectedId(store.addEnvironment(name));
                }}
                className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Add">
                <Plus className="size-3.5" />
              </button>
            </div>
            {envs.map((e) => (
              <button key={e.id} onClick={() => setSelectedId(e.id)}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs transition-colors ${
                  selectedId === e.id ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                }`}>
                <Globe2 className="size-3.5" />
                <span className="flex-1 truncate font-medium">{e.name}</span>
                {activeId === e.id && <span className="text-mono rounded bg-brand/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-brand">Active</span>}
              </button>
            ))}
          </div>

          {/* Detail */}
          <div className="rounded-lg border border-border/60 bg-surface-2/40">
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
              <input
                value={selected.name}
                onChange={(e) => store.updateEnvironment(selected.id, { name: e.target.value })}
                className="bg-transparent text-sm font-semibold tracking-tight outline-none"
              />
              <div className="flex gap-2">
                {activeId !== selected.id && (
                  <button onClick={() => store.activateEnv(selected.id)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md bg-brand px-3 text-xs font-semibold text-brand-foreground hover:opacity-90">
                    <Check className="size-3.5" /> Activate
                  </button>
                )}
                <button onClick={() => store.addEnvVar(selected.id)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface-2 px-3 text-xs font-medium text-muted-foreground hover:text-foreground">
                  <Plus className="size-3.5" /> Variable
                </button>
                {envs.length > 1 && (
                  <button onClick={() => { if (confirm("Delete environment?")) store.deleteEnvironment(selected.id); }}
                    className="grid size-8 place-items-center rounded-md border border-border bg-surface-2 text-muted-foreground hover:border-danger/40 hover:text-danger" aria-label="Delete">
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="text-mono grid grid-cols-[28px_1fr_1fr_70px_36px] border-b border-border/60 text-[10px] uppercase tracking-widest text-muted-foreground">
              <div className="px-2 py-2 text-center">On</div>
              <div className="px-3 py-2">Key</div>
              <div className="px-3 py-2">Value</div>
              <div className="px-2 py-2 text-center">Secret</div>
              <div />
            </div>
            {selected.variables.length === 0 && (
              <p className="px-4 py-8 text-center text-xs text-muted-foreground">No variables yet. Click "Variable" to add one.</p>
            )}
            {selected.variables.map((v) => (
              <div key={v.id} className="grid grid-cols-[28px_1fr_1fr_70px_36px] border-b border-border/40 last:border-0 hover:bg-accent/20">
                <div className="grid place-items-center">
                  <input type="checkbox" checked={v.enabled} onChange={(e) => store.updateEnvVar(selected.id, v.id, { enabled: e.target.checked })}
                    className="size-3 accent-[color:var(--brand)]" />
                </div>
                <input value={v.key} onChange={(e) => store.updateEnvVar(selected.id, v.id, { key: e.target.value })}
                  placeholder="KEY"
                  className="text-mono h-9 w-full bg-transparent px-3 text-xs uppercase outline-none placeholder:text-muted-foreground/40" />
                <div className="flex items-center">
                  <input
                    type={v.secret && !reveal[v.id] ? "password" : "text"}
                    value={v.value}
                    onChange={(e) => store.updateEnvVar(selected.id, v.id, { value: e.target.value })}
                    placeholder="value"
                    className="text-mono h-9 w-full bg-transparent px-3 text-xs outline-none placeholder:text-muted-foreground/40" />
                  {v.secret && (
                    <button onClick={() => setReveal((r) => ({ ...r, [v.id]: !r[v.id] }))}
                      className="mr-2 grid size-6 place-items-center rounded text-muted-foreground hover:text-foreground" aria-label="Reveal">
                      {reveal[v.id] ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                    </button>
                  )}
                </div>
                <div className="grid place-items-center">
                  <input type="checkbox" checked={v.secret} onChange={(e) => store.updateEnvVar(selected.id, v.id, { secret: e.target.checked })}
                    className="size-3 accent-[color:var(--brand)]" />
                </div>
                <button onClick={() => store.deleteEnvVar(selected.id, v.id)} aria-label="Remove"
                  className="grid place-items-center text-muted-foreground hover:text-danger"><Trash2 className="size-3" /></button>
              </div>
            ))}

            <div className="border-t border-border/60 bg-surface-2/30 px-4 py-3 text-[11px] text-muted-foreground">
              Reference variables in URLs, headers and bodies using <code className="text-mono text-foreground">{"{{KEY}}"}</code>.
            </div>
          </div>
        </div>
      </EndpointsWorkspace>
    </AppShell>
  );
}
