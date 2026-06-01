// Endpoint builder — used by both /endpoints/new and /endpoints/:id/edit.
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Save, Play, ChevronDown, Plus, Trash2, X, Check, ArrowLeft,
} from "lucide-react";
import { AppShell, MethodBadge } from "@/components/app/AppShell";
import { EndpointsWorkspace } from "@/components/app/EndpointsWorkspace";
import { CodeEditor } from "@/components/app/CodeEditor";
import {
  useStore, store, utils, type EndpointConfig, type KV, type AuthKind, type BodyKind,
} from "@/lib/store";
import type { Method } from "@/lib/mock";

const TABS = ["Params", "Auth", "Headers", "Body", "Monitoring", "Pre-request"] as const;
type Tab = (typeof TABS)[number];

const METHODS: Method[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

export function EndpointBuilder({ initial }: { initial: EndpointConfig }) {
  const navigate = useNavigate();
  const collections = useStore((s) => s.collections);
  const environments = useStore((s) => s.environments);
  const activeEnv = environments.find((e) => e.id === useStore((s) => s.activeEnvId));
  const [draft, setDraft] = useState<EndpointConfig>(initial);
  const [tab, setTab] = useState<Tab>("Params");
  const [testing, setTesting] = useState(false);
  const [response, setResponse] = useState<null | {
    status: number; time: number; size: string; body: string; headers: Record<string, string>;
  }>(null);
  const [respTab, setRespTab] = useState<"Pretty" | "Raw" | "Headers" | "Schema">("Pretty");

  // Sync params <-> URL
  useEffect(() => {
    const fromUrl = utils.urlToParams(draft.url);
    if (fromUrl.length && draft.params.every((p) => !p.key)) {
      setDraft((d) => ({ ...d, params: [...fromUrl, utils.newKV()] }));
    }
    // run once on mount with provided initial
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onParamsChange = (params: KV[]) => {
    const url = utils.paramsToUrl(draft.url, params);
    setDraft((d) => ({ ...d, params, url }));
  };
  const onUrlChange = (url: string) => {
    setDraft((d) => ({ ...d, url, params: [...utils.urlToParams(url), utils.newKV()] }));
  };

  const save = () => {
    store.upsertEndpoint(draft);
    navigate({ to: "/endpoints/$id", params: { id: draft.id } });
  };

  const runTest = () => {
    setTesting(true);
    setResponse(null);
    setTimeout(() => {
      const resolvedUrl = utils.resolve(draft.url, activeEnv);
      const sample = {
        ok: true,
        endpoint: resolvedUrl,
        data: { id: "evt_4f2a", total_due: 12450, currency: { code: "USD", symbol: "$" } },
        meta: { generated_at: new Date().toISOString(), schema_version: "v1.4.2" },
      };
      setResponse({
        status: 200,
        time: 80 + Math.floor(Math.random() * 220),
        size: "1.2 KB",
        body: JSON.stringify(sample, null, 2),
        headers: { "content-type": "application/json", "x-request-id": "req_" + Math.random().toString(36).slice(2, 10) },
      });
      setTesting(false);
    }, 900);
  };

  const isNew = !useStore((s) => s.endpoints.find((e) => e.id === draft.id));

  return (
    <AppShell title={isNew ? "New endpoint" : draft.name} subtitle={isNew ? "Configure a new monitored endpoint" : "Edit endpoint configuration"}
      actions={
        <Link to="/endpoints" className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface-2 px-3 text-xs font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Back
        </Link>
      }>
      <EndpointsWorkspace>
        {/* Top builder bar */}
        <div className="rounded-lg border border-border/60 bg-surface-2/40 p-4">
          <input
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder="Untitled request"
            className="mb-3 w-full bg-transparent text-base font-semibold tracking-tight outline-none placeholder:text-muted-foreground/60"
          />

          <div className="flex flex-wrap items-stretch gap-2">
            <div className="flex flex-1 min-w-[280px] items-stretch overflow-hidden rounded-md border border-border bg-surface-2/60 focus-within:border-brand/50">
              <select
                value={draft.method}
                onChange={(e) => setDraft((d) => ({ ...d, method: e.target.value as Method }))}
                className="text-mono h-9 border-r border-border bg-transparent pl-3 pr-7 text-[11px] font-bold tracking-wider outline-none"
              >
                {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <input
                value={draft.url}
                onChange={(e) => onUrlChange(e.target.value)}
                placeholder="{{BASE_URL}}/v2/resource"
                className="text-mono h-9 w-full bg-transparent px-3 text-xs outline-none placeholder:text-muted-foreground/60"
              />
            </div>

            <button onClick={runTest} disabled={testing}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-surface-2 px-3 text-xs font-semibold text-foreground hover:bg-accent disabled:opacity-50">
              <Play className="size-3.5" /> {testing ? "Sending…" : "Test Now"}
            </button>
            <button onClick={save}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-foreground px-3 text-xs font-semibold text-background hover:bg-white">
              <Save className="size-3.5" /> Save
            </button>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Pill label="Collection">
              <select
                value={draft.collectionId ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, collectionId: e.target.value || null }))}
                className="text-mono h-7 w-full rounded-md border border-border bg-surface-2/60 px-2 text-[11px] outline-none focus:border-brand/50">
                <option value="">— Unassigned —</option>
                {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Pill>
            <Pill label="Polling interval">
              <div className="flex items-center gap-1">
                <input type="number" min={1} value={draft.intervalMin}
                  onChange={(e) => setDraft((d) => ({ ...d, intervalMin: Number(e.target.value) || 1 }))}
                  className="text-mono h-7 w-full rounded-md border border-border bg-surface-2/60 px-2 text-[11px] outline-none focus:border-brand/50" />
                <span className="text-mono text-[11px] text-muted-foreground">min</span>
              </div>
            </Pill>
            <Pill label="Environment">
              <select
                value={draft.environmentId ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, environmentId: e.target.value || null }))}
                className="text-mono h-7 w-full rounded-md border border-border bg-surface-2/60 px-2 text-[11px] outline-none focus:border-brand/50">
                {environments.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </Pill>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-5 border-b border-border/60">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`relative h-9 px-3 text-xs font-medium transition-colors ${
                  tab === t ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}>
                {t}
                {tab === t && <span className="absolute inset-x-2 bottom-0 h-px bg-brand" />}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-border/60 bg-surface-2/40 p-4 animate-fade-in">
          {tab === "Params" && <KvTable rows={draft.params} setRows={onParamsChange} keyLabel="Key" valLabel="Value" />}
          {tab === "Headers" && <KvTable rows={draft.headersKv} setRows={(rows) => setDraft((d) => ({ ...d, headersKv: rows }))} keyLabel="Header" valLabel="Value" />}
          {tab === "Auth" && <AuthTab auth={draft.auth} setAuth={(auth) => setDraft((d) => ({ ...d, auth }))} />}
          {tab === "Body" && <BodyTab body={draft.body} setBody={(body) => setDraft((d) => ({ ...d, body }))} />}
          {tab === "Monitoring" && <MonitoringTab draft={draft} setDraft={setDraft} />}
          {tab === "Pre-request" && (
            <>
              <p className="mb-2 text-xs text-muted-foreground">JavaScript executed before each poll. Mutate <code className="text-mono text-foreground">req</code> or read <code className="text-mono text-foreground">env</code> variables.</p>
              <CodeEditor language="javascript" value={draft.preScript} onChange={(v) => setDraft((d) => ({ ...d, preScript: v }))} />
            </>
          )}
        </div>

        {/* Response panel */}
        {(testing || response) && (
          <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[calc(100vw-16rem-3rem)] translate-x-[8rem] rounded-t-xl border border-b-0 border-border bg-card shadow-elevated animate-fade-up">
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
              <div className="flex items-center gap-3">
                <span className="text-mono text-[11px] uppercase tracking-widest text-muted-foreground">Response</span>
                {response && (
                  <>
                    <Badge color={response.status < 300 ? "emerald" : "rose"}>{response.status} OK</Badge>
                    <span className="text-mono text-[11px] text-muted-foreground">{response.time} ms · {response.size}</span>
                  </>
                )}
                {testing && <span className="text-mono text-[11px] text-muted-foreground">running…</span>}
              </div>
              <button onClick={() => setResponse(null)} aria-label="Close"
                className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"><X className="size-3.5" /></button>
            </div>
            {response && (
              <>
                <div className="flex gap-1 border-b border-border/60 px-2">
                  {(["Pretty", "Raw", "Headers", "Schema"] as const).map((rt) => (
                    <button key={rt} onClick={() => setRespTab(rt)}
                      className={`relative h-8 px-2.5 text-[11px] font-medium ${respTab === rt ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                      {rt}
                      {respTab === rt && <span className="absolute inset-x-1 bottom-0 h-px bg-brand" />}
                    </button>
                  ))}
                </div>
                <div className="max-h-[42vh] overflow-auto p-3">
                  {respTab === "Pretty" && <pre className="text-mono whitespace-pre text-[12px] leading-5">{response.body}</pre>}
                  {respTab === "Raw" && <pre className="text-mono whitespace-pre-wrap break-all text-[12px] leading-5">{response.body}</pre>}
                  {respTab === "Headers" && (
                    <table className="w-full text-xs">
                      <tbody>
                        {Object.entries(response.headers).map(([k, v]) => (
                          <tr key={k} className="border-b border-border/40 last:border-0">
                            <td className="text-mono py-1.5 pr-4 text-muted-foreground">{k}</td>
                            <td className="text-mono py-1.5">{v}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {respTab === "Schema" && <SchemaPreview body={response.body} />}
                </div>
              </>
            )}
          </div>
        )}
      </EndpointsWorkspace>
    </AppShell>
  );
}

function Pill({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-mono mb-1 block text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
function Badge({ children, color }: { children: React.ReactNode; color: "emerald" | "rose" }) {
  const cls = color === "emerald" ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/20" : "text-rose-300 bg-rose-500/10 border-rose-500/20";
  return <span className={`text-mono inline-flex h-5 items-center rounded border px-1.5 text-[10px] font-semibold tracking-wider ${cls}`}>{children}</span>;
}

function KvTable({ rows, setRows, keyLabel, valLabel }: {
  rows: KV[]; setRows: (r: KV[]) => void; keyLabel: string; valLabel: string;
}) {
  const update = (i: number, patch: Partial<KV>) => {
    const next = rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r));
    // auto-append blank row when typing in last
    if (i === rows.length - 1 && (patch.key || patch.value)) next.push(utils.newKV());
    setRows(next);
  };
  const remove = (i: number) => setRows(rows.filter((_, idx) => idx !== i));
  return (
    <div className="overflow-hidden rounded-md border border-border/60">
      <div className="text-mono grid grid-cols-[28px_1fr_1fr_28px] gap-0 border-b border-border/60 bg-surface-2/40 text-[10px] uppercase tracking-widest text-muted-foreground">
        <div className="px-2 py-2 text-center">On</div>
        <div className="px-3 py-2">{keyLabel}</div>
        <div className="px-3 py-2">{valLabel}</div>
        <div />
      </div>
      {rows.length === 0 && <button onClick={() => setRows([utils.newKV()])} className="block w-full px-3 py-3 text-left text-xs text-muted-foreground hover:bg-accent/30">+ Add row</button>}
      {rows.map((r, i) => (
        <div key={r.id} className="grid grid-cols-[28px_1fr_1fr_28px] border-b border-border/40 last:border-0 hover:bg-accent/20">
          <div className="grid place-items-center">
            <input type="checkbox" checked={r.enabled} onChange={(e) => update(i, { enabled: e.target.checked })}
              className="size-3 accent-[color:var(--brand)]" />
          </div>
          <input value={r.key} onChange={(e) => update(i, { key: e.target.value })}
            className="text-mono h-8 w-full bg-transparent px-3 text-xs outline-none placeholder:text-muted-foreground/40" placeholder="key" />
          <input value={r.value} onChange={(e) => update(i, { value: e.target.value })}
            className="text-mono h-8 w-full bg-transparent px-3 text-xs outline-none placeholder:text-muted-foreground/40" placeholder="value" />
          <button onClick={() => remove(i)} aria-label="Remove" className="grid place-items-center text-muted-foreground hover:text-danger">
            <Trash2 className="size-3" />
          </button>
        </div>
      ))}
    </div>
  );
}

function AuthTab({ auth, setAuth }: { auth: EndpointConfig["auth"]; setAuth: (a: EndpointConfig["auth"]) => void }) {
  const kinds: { id: AuthKind; label: string }[] = [
    { id: "none", label: "None" },
    { id: "bearer", label: "Bearer Token" },
    { id: "apiKey", label: "API Key" },
    { id: "basic", label: "Basic Auth" },
  ];
  return (
    <div>
      <div className="mb-4 flex gap-1 rounded-md border border-border bg-surface-2/40 p-1">
        {kinds.map((k) => (
          <button key={k.id} onClick={() => setAuth({ ...auth, kind: k.id })}
            className={`h-7 flex-1 rounded text-[11px] font-medium transition-colors ${
              auth.kind === k.id ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}>{k.label}</button>
        ))}
      </div>
      {auth.kind === "bearer" && (
        <Field label="Token">
          <input value={auth.bearer ?? ""} onChange={(e) => setAuth({ ...auth, bearer: e.target.value })}
            placeholder="{{API_TOKEN}}"
            className="text-mono h-9 w-full rounded-md border border-border bg-surface-2/60 px-3 text-xs outline-none focus:border-brand/50" />
        </Field>
      )}
      {auth.kind === "apiKey" && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Key">
            <input value={auth.apiKey?.key ?? ""} onChange={(e) => setAuth({ ...auth, apiKey: { key: e.target.value, value: auth.apiKey?.value ?? "", in: auth.apiKey?.in ?? "header" } })}
              className="text-mono h-9 w-full rounded-md border border-border bg-surface-2/60 px-3 text-xs outline-none focus:border-brand/50" />
          </Field>
          <Field label="Value">
            <input value={auth.apiKey?.value ?? ""} onChange={(e) => setAuth({ ...auth, apiKey: { key: auth.apiKey?.key ?? "", value: e.target.value, in: auth.apiKey?.in ?? "header" } })}
              className="text-mono h-9 w-full rounded-md border border-border bg-surface-2/60 px-3 text-xs outline-none focus:border-brand/50" />
          </Field>
          <Field label="Add to">
            <select value={auth.apiKey?.in ?? "header"} onChange={(e) => setAuth({ ...auth, apiKey: { key: auth.apiKey?.key ?? "", value: auth.apiKey?.value ?? "", in: e.target.value as "header" | "query" } })}
              className="text-mono h-9 w-full rounded-md border border-border bg-surface-2/60 px-3 text-xs outline-none focus:border-brand/50">
              <option value="header">Header</option>
              <option value="query">Query param</option>
            </select>
          </Field>
        </div>
      )}
      {auth.kind === "basic" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Username">
            <input value={auth.basic?.user ?? ""} onChange={(e) => setAuth({ ...auth, basic: { user: e.target.value, pass: auth.basic?.pass ?? "" } })}
              className="text-mono h-9 w-full rounded-md border border-border bg-surface-2/60 px-3 text-xs outline-none focus:border-brand/50" />
          </Field>
          <Field label="Password">
            <input type="password" value={auth.basic?.pass ?? ""} onChange={(e) => setAuth({ ...auth, basic: { user: auth.basic?.user ?? "", pass: e.target.value } })}
              className="text-mono h-9 w-full rounded-md border border-border bg-surface-2/60 px-3 text-xs outline-none focus:border-brand/50" />
          </Field>
        </div>
      )}
      {auth.kind === "none" && <p className="text-xs text-muted-foreground">No authentication will be sent with this request.</p>}
    </div>
  );
}

function BodyTab({ body, setBody }: { body: EndpointConfig["body"]; setBody: (b: EndpointConfig["body"]) => void }) {
  const kinds: { id: BodyKind; label: string }[] = [
    { id: "none", label: "None" },
    { id: "json", label: "JSON" },
    { id: "form-data", label: "form-data" },
    { id: "x-www-form-urlencoded", label: "x-www-form-urlencoded" },
    { id: "raw", label: "Raw" },
  ];
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1 rounded-md border border-border bg-surface-2/40 p-1">
        {kinds.map((k) => (
          <button key={k.id} onClick={() => setBody({ ...body, kind: k.id })}
            className={`h-7 flex-1 rounded px-2 text-[11px] font-medium transition-colors ${
              body.kind === k.id ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}>{k.label}</button>
        ))}
      </div>
      {body.kind === "none" && <p className="text-xs text-muted-foreground">This request has no body.</p>}
      {body.kind === "json" && (
        <CodeEditor language="json" value={body.json ?? ""} onChange={(v) => setBody({ ...body, json: v })} />
      )}
      {body.kind === "raw" && (
        <textarea value={body.raw ?? ""} onChange={(e) => setBody({ ...body, raw: e.target.value })} rows={10}
          className="text-mono w-full rounded-md border border-border bg-surface-2/60 p-3 text-xs outline-none focus:border-brand/50" />
      )}
      {(body.kind === "form-data" || body.kind === "x-www-form-urlencoded") && (
        <KvTable
          rows={(body.kind === "form-data" ? body.form : body.urlencoded) ?? []}
          setRows={(rows) => setBody(body.kind === "form-data" ? { ...body, form: rows } : { ...body, urlencoded: rows })}
          keyLabel="Field" valLabel="Value"
        />
      )}
    </div>
  );
}

function MonitoringTab({ draft, setDraft }: { draft: EndpointConfig; setDraft: React.Dispatch<React.SetStateAction<EndpointConfig>> }) {
  const environments = useStore((s) => s.environments);
  const [tagInput, setTagInput] = useState("");
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Polling interval (min)">
        <input type="number" min={1} value={draft.intervalMin}
          onChange={(e) => setDraft((d) => ({ ...d, intervalMin: Number(e.target.value) || 1 }))}
          className="text-mono h-9 w-full rounded-md border border-border bg-surface-2/60 px-3 text-xs outline-none focus:border-brand/50" />
      </Field>
      <Field label="Timeout (ms)">
        <input type="number" min={500} step={500} value={draft.timeoutMs}
          onChange={(e) => setDraft((d) => ({ ...d, timeoutMs: Number(e.target.value) || 1000 }))}
          className="text-mono h-9 w-full rounded-md border border-border bg-surface-2/60 px-3 text-xs outline-none focus:border-brand/50" />
      </Field>
      <Field label="Environment">
        <select value={draft.environmentId ?? ""} onChange={(e) => setDraft((d) => ({ ...d, environmentId: e.target.value || null }))}
          className="text-mono h-9 w-full rounded-md border border-border bg-surface-2/60 px-3 text-xs outline-none focus:border-brand/50">
          {environments.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </Field>
      <Field label="Tags">
        <div className="flex flex-wrap gap-1.5 rounded-md border border-border bg-surface-2/60 p-2">
          {draft.tags.map((t) => (
            <span key={t} className="text-mono inline-flex items-center gap-1 rounded bg-accent px-1.5 py-0.5 text-[10px]">
              {t}
              <button onClick={() => setDraft((d) => ({ ...d, tags: d.tags.filter((x) => x !== t) }))}><X className="size-3" /></button>
            </span>
          ))}
          <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && tagInput.trim()) {
                e.preventDefault();
                setDraft((d) => ({ ...d, tags: [...new Set([...d.tags, tagInput.trim()])] }));
                setTagInput("");
              }
            }}
            placeholder="Add tag…"
            className="text-mono min-w-[80px] flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/40" />
        </div>
      </Field>
      <Toggle label="Follow redirects" checked={draft.followRedirects} onChange={(v) => setDraft((d) => ({ ...d, followRedirects: v }))} />
      <Toggle label="SSL verification" checked={draft.sslVerify} onChange={(v) => setDraft((d) => ({ ...d, sslVerify: v }))} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-mono mb-1.5 block text-[11px] uppercase tracking-widest text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex h-9 cursor-pointer items-center justify-between rounded-md border border-border bg-surface-2/60 px-3">
      <span className="text-xs">{label}</span>
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={`relative h-4 w-7 rounded-full transition-colors ${checked ? "bg-brand" : "bg-muted"}`}>
        <span className={`absolute top-0.5 size-3 rounded-full bg-background transition-transform ${checked ? "translate-x-3.5" : "translate-x-0.5"}`} />
      </button>
    </label>
  );
}

function SchemaPreview({ body }: { body: string }) {
  let parsed: unknown;
  try { parsed = JSON.parse(body); } catch { return <p className="text-mono text-xs text-danger">Body is not valid JSON.</p>; }
  const lines: string[] = [];
  const walk = (v: unknown, path: string) => {
    if (v === null) { lines.push(`${path}: null`); return; }
    if (Array.isArray(v)) { lines.push(`${path}: array[${v.length}]`); if (v[0] !== undefined) walk(v[0], `${path}[0]`); return; }
    if (typeof v === "object") {
      for (const k of Object.keys(v as object)) walk((v as Record<string, unknown>)[k], path ? `${path}.${k}` : k);
      return;
    }
    lines.push(`${path}: ${typeof v}`);
  };
  walk(parsed, "");
  return (
    <div className="overflow-hidden rounded-md border border-border/60 bg-surface-2/40">
      <div className="border-b border-border/60 px-3 py-1.5 text-mono text-[10px] uppercase tracking-widest text-muted-foreground">Inferred schema</div>
      <pre className="text-mono p-3 text-[11px] leading-5">
        {lines.map((l) => {
          const [p, t] = l.split(": ");
          return <div key={l}><span className="text-foreground/90">{p}</span><span className="text-muted-foreground"> : {t}</span></div>;
        })}
      </pre>
    </div>
  );
}
