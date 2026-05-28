import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Pause, Play, Trash2, ExternalLink, X } from "lucide-react";
import { AppShell, StatusDot, MethodBadge } from "@/components/app/AppShell";
import { mockEndpoints, timeAgo, type Endpoint, type Method } from "@/lib/mock";

export const Route = createFileRoute("/_app/endpoints")({
  head: () => ({ meta: [{ title: "Endpoints — SchemaGuard" }] }),
  component: EndpointsPage,
});

function EndpointsPage() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>(mockEndpoints);
  const [open, setOpen] = useState(false);

  const toggle = (id: string) =>
    setEndpoints((xs) => xs.map((e) => e.id === id ? { ...e, status: e.status === "paused" ? "healthy" : "paused" } : e));
  const remove = (id: string) =>
    setEndpoints((xs) => xs.filter((e) => e.id !== id));
  const add = (e: Endpoint) => setEndpoints((xs) => [e, ...xs]);

  return (
    <AppShell title="Endpoints" subtitle="Register and monitor APIs for schema drift"
      actions={<button onClick={() => setOpen(true)} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-foreground px-3 text-xs font-semibold text-background hover:bg-white">
        <Plus className="size-3.5" /> Add endpoint</button>}>

      <div className="overflow-hidden rounded-lg border border-border/60 bg-surface-2/40">
        <table className="w-full text-sm">
          <thead className="text-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <tr className="border-b border-border/60">
              <th className="px-4 py-2.5 text-left font-medium">Status</th>
              <th className="px-4 py-2.5 text-left font-medium">Endpoint</th>
              <th className="px-4 py-2.5 text-left font-medium">Method</th>
              <th className="px-4 py-2.5 text-left font-medium">Interval</th>
              <th className="px-4 py-2.5 text-left font-medium">Last check</th>
              <th className="px-4 py-2.5 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {endpoints.map((e) => (
              <tr key={e.id} className="border-b border-border/40 last:border-0 transition-colors hover:bg-accent/30">
                <td className="px-4 py-3"><StatusDot status={e.status} /></td>
                <td className="px-4 py-3">
                  <div className="font-medium">{e.name}</div>
                  <div className="text-mono truncate text-[11px] text-muted-foreground">{e.url}</div>
                </td>
                <td className="px-4 py-3"><MethodBadge method={e.method} /></td>
                <td className="text-mono px-4 py-3 text-[11px] text-muted-foreground">{e.intervalMin}m</td>
                <td className="text-mono px-4 py-3 text-[11px] text-muted-foreground">{timeAgo(e.lastCheckedAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Link to="/endpoints/$id" params={{ id: e.id }}
                      className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-surface-2 px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground">
                      <ExternalLink className="size-3" /> Details
                    </Link>
                    <button onClick={() => toggle(e.id)}
                      className="grid size-7 place-items-center rounded-md border border-border bg-surface-2 text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={e.status === "paused" ? "Resume" : "Pause"}>
                      {e.status === "paused" ? <Play className="size-3" /> : <Pause className="size-3" />}
                    </button>
                    <button onClick={() => remove(e.id)}
                      className="grid size-7 place-items-center rounded-md border border-border bg-surface-2 text-muted-foreground transition-colors hover:border-danger/40 hover:text-danger"
                      aria-label="Delete">
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {endpoints.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">No endpoints. Add one to start monitoring.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {open && <AddEndpointModal onClose={() => setOpen(false)} onAdd={(ep) => { add(ep); setOpen(false); }} />}
    </AppShell>
  );
}

function AddEndpointModal({ onClose, onAdd }: { onClose: () => void; onAdd: (e: Endpoint) => void }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [method, setMethod] = useState<Method>("GET");
  const [interval, setInterval] = useState(5);
  const [headers, setHeaders] = useState('{\n  "Authorization": "Bearer ..."\n}');
  const [error, setError] = useState("");

  const submit = () => {
    setError("");
    if (!name || !url) { setError("Name and URL are required"); return; }
    let parsed: Record<string, string> | undefined;
    try { parsed = headers.trim() ? JSON.parse(headers) : undefined; }
    catch { setError("Headers must be valid JSON"); return; }
    onAdd({
      id: "ep_" + Math.random().toString(36).slice(2, 8),
      name, url, method, intervalMin: interval, headers: parsed,
      status: "healthy", lastCheckedAt: new Date().toISOString(), driftCount: 0,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-elevated" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-3.5">
          <h3 className="text-sm font-semibold tracking-tight">Register a new endpoint</h3>
          <button onClick={onClose} className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"><X className="size-4" /></button>
        </div>
        <div className="space-y-4 px-5 py-5">
          <Input label="Name" value={name} onChange={setName} placeholder="Billing — Invoices" />
          <Input label="URL" value={url} onChange={setUrl} placeholder="https://api.example.com/v1/resource" mono />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Method" value={method} onChange={(v) => setMethod(v as Method)} options={["GET", "POST", "PUT", "PATCH", "DELETE"]} />
            <Input label="Interval (min)" type="number" value={String(interval)} onChange={(v) => setInterval(Number(v) || 1)} />
          </div>
          <label className="block">
            <span className="text-mono mb-1.5 block text-[11px] uppercase tracking-widest text-muted-foreground">Headers (JSON)</span>
            <textarea value={headers} onChange={(e) => setHeaders(e.target.value)} rows={4}
              className="text-mono w-full rounded-md border border-border bg-surface-2/60 p-3 text-xs outline-none transition-colors focus:border-brand/50" />
          </label>
          {error && <p className="text-mono text-xs text-danger">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border/60 px-5 py-3">
          <button onClick={onClose} className="h-8 rounded-md px-3 text-xs font-medium text-muted-foreground hover:text-foreground">Cancel</button>
          <button onClick={submit} className="h-8 rounded-md bg-foreground px-3 text-xs font-semibold text-background hover:bg-white">Create endpoint</button>
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = "text", mono }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; mono?: boolean }) {
  return (
    <label className="block">
      <span className="text-mono mb-1.5 block text-[11px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className={`h-9 w-full rounded-md border border-border bg-surface-2/60 px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-brand/50 ${mono ? "text-mono text-xs" : ""}`} />
    </label>
  );
}
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="block">
      <span className="text-mono mb-1.5 block text-[11px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="text-mono h-9 w-full rounded-md border border-border bg-surface-2/60 px-3 text-xs font-semibold outline-none transition-colors focus:border-brand/50">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
