/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useEffect } from "react";

type MethodKey = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

const METHOD_COLORS: Record<string, { bg: string; text: string; light: string }> = {
  GET: { bg: "#1a9c52", text: "#fff", light: "rgba(26,156,82,0.15)" },
  POST: { bg: "#d97706", text: "#fff", light: "rgba(217,119,6,0.15)" },
  PUT: { bg: "#2563eb", text: "#fff", light: "rgba(37,99,235,0.15)" },
  PATCH: { bg: "#7c3aed", text: "#fff", light: "rgba(124,58,237,0.15)" },
  DELETE: { bg: "#dc2626", text: "#fff", light: "rgba(220,38,38,0.15)" },
  HEAD: { bg: "#0891b2", text: "#fff", light: "rgba(8,145,178,0.15)" },
  OPTIONS: { bg: "#db2777", text: "#fff", light: "rgba(219,39,119,0.15)" },
};

const METHODS: MethodKey[] = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

const AUTO_HEADERS = [
  { key: "Authorization", value: "Bearer {{API_TOKEN}}", auto: true },
  { key: "Host", value: "<calculated when request is sent>", auto: true },
  { key: "User-Agent", value: "SchemaGuard/1.0 (Runtime/v2.4)", auto: true },
  { key: "Accept", value: "*/*", auto: true },
  { key: "Accept-Encoding", value: "gzip, deflate, br", auto: true },
  { key: "Connection", value: "keep-alive", auto: true },
];

type KV = { id: string; key: string; value: string; desc: string; enabled: boolean };

function uid() {
  return Math.random().toString(36).slice(2, 9);
}
function newKV(): KV {
  return { id: uid(), key: "", value: "", desc: "", enabled: true };
}

type BodyState = { kind: string; raw: string; rawLang: string };
type State = {
  name: string;
  method: string;
  url: string;
  params: KV[];
  headers: KV[];
  authKind: string;
  bearer: string;
  body: BodyState;
  preScript: string;
  postScript: string;
  settings: { followRedirects: boolean; ssl: boolean; timeout: number; interval: number };
};

const initialState: State = {
  name: "Get all endpoints",
  method: "GET",
  url: "http://localhost:5000/api/endpoints",
  params: [newKV()],
  headers: [
    { id: uid(), key: "Accept", value: "application/json", desc: "", enabled: true },
    newKV(),
  ],
  authKind: "bearer",
  bearer: "sk_live_•••••••••••••••••••••••••••••••••",
  body: {
    kind: "none",
    raw: '{\n  "name": "My Endpoint",\n  "url": "https://api.example.com/v1/users",\n  "method": "GET"\n}',
    rawLang: "JSON",
  },
  preScript:
    "// Runs before each request\n// pm.request.headers.add({ key: 'X-Trace-ID', value: pm.variables.replaceIn('{{$randomUUID}}') });\n",
  postScript:
    "// Runs after response\npm.test('Status 200', () => pm.response.to.have.status(200));\npm.test('Response time < 500ms', () => pm.expect(pm.response.responseTime).to.be.below(500));\n",
  settings: { followRedirects: true, ssl: true, timeout: 8000, interval: 5 },
};

function KVTable({
  rows,
  setRows,
  keyPh = "Key",
  showDesc = true,
  autoRows = null,
  hideAuto = false,
}: {
  rows: KV[];
  setRows: (rows: KV[]) => void;
  keyPh?: string;
  valPh?: string;
  showDesc?: boolean;
  autoRows?: { key: string; value: string; auto?: boolean }[] | null;
  hideAuto?: boolean;
}) {
  const update = (i: number, patch: Partial<KV>) => {
    const next = rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r));
    if (i === rows.length - 1 && (patch.key || patch.value)) next.push(newKV());
    setRows(next);
  };
  const remove = (i: number) => setRows(rows.filter((_, idx) => idx !== i));

  return (
    <div style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      {autoRows && !hideAuto && (
        <div style={{ marginBottom: 8, border: "0.5px solid rgba(255,255,255,0.06)", borderRadius: 6, overflow: "hidden" }}>
          {autoRows.map((r, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "28px 1.1fr 1.4fr 28px", borderBottom: i < autoRows.length - 1 ? "0.5px solid rgba(255,255,255,0.04)" : "none", background: "rgba(255,255,255,0.02)", opacity: 0.6 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 12, height: 12, border: "1.5px solid #1a9c52", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 7, height: 7, background: "#1a9c52", borderRadius: 1 }} />
                </div>
              </div>
              <div style={{ padding: "7px 10px", fontSize: 11, color: "rgba(255,255,255,0.75)", display: "flex", alignItems: "center", gap: 6 }}>
                {r.key}
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 14, height: 14, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.2)", fontSize: 9, color: "rgba(255,255,255,0.4)", cursor: "default" }}>i</span>
              </div>
              <div style={{ padding: "7px 10px", fontSize: 11, color: "rgba(255,255,255,0.35)", fontStyle: "italic" }}>{r.value}</div>
              <div />
            </div>
          ))}
        </div>
      )}
      <div style={{ border: "0.5px solid rgba(255,255,255,0.08)", borderRadius: 6, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: showDesc ? "28px 1.2fr 1.4fr 1.2fr 28px" : "28px 1.2fr 1.4fr 28px", background: "rgba(255,255,255,0.03)", borderBottom: "0.5px solid rgba(255,255,255,0.07)", padding: "5px 0" }}>
          <div />
          <div style={{ padding: "0 10px", fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{keyPh}</div>
          <div style={{ padding: "0 10px", fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Value</div>
          {showDesc && <div style={{ padding: "0 10px", fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Description</div>}
          <div />
        </div>
        {rows.map((r, i) => (
          <div key={r.id} style={{ display: "grid", gridTemplateColumns: showDesc ? "28px 1.2fr 1.4fr 1.2fr 28px" : "28px 1.2fr 1.4fr 28px", borderBottom: i < rows.length - 1 ? "0.5px solid rgba(255,255,255,0.04)" : "none", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)", transition: "background 0.1s" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div onClick={() => update(i, { enabled: !r.enabled })} style={{ width: 12, height: 12, border: `1.5px solid ${r.enabled ? "#1a9c52" : "rgba(255,255,255,0.2)"}`, borderRadius: 2, background: r.enabled ? "#1a9c52" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.15s" }}>
                {r.enabled && (
                  <svg width="7" height="7" viewBox="0 0 10 10"><path d="M1.5 5l3 3 4-6" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" /></svg>
                )}
              </div>
            </div>
            <input value={r.key} onChange={(e) => update(i, { key: e.target.value })} placeholder={keyPh} style={{ background: "transparent", border: "none", outline: "none", padding: "7px 10px", fontSize: 12, color: r.key ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.25)", fontFamily: "inherit", width: "100%" }} />
            <input value={r.value} onChange={(e) => update(i, { value: e.target.value })} placeholder="Value" style={{ background: "transparent", border: "none", outline: "none", padding: "7px 10px", fontSize: 12, color: r.value ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.25)", fontFamily: "inherit", width: "100%" }} />
            {showDesc && (
              <input value={r.desc || ""} onChange={(e) => update(i, { desc: e.target.value })} placeholder="Description" style={{ background: "transparent", border: "none", outline: "none", padding: "7px 10px", fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "inherit", width: "100%" }} />
            )}
            <button onClick={() => remove(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.25)", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", transition: "color 0.15s" }} onMouseEnter={(e) => (e.currentTarget.style.color = "#dc2626")} onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
            </button>
          </div>
        ))}
        {rows.length === 0 && (
          <button onClick={() => setRows([newKV()])} style={{ width: "100%", padding: "12px", background: "none", border: "none", color: "rgba(255,255,255,0.35)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>+ Add row</button>
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
        <button style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 11, cursor: "pointer", fontFamily: "inherit", textTransform: "uppercase", letterSpacing: "0.07em" }}>Bulk Edit</button>
      </div>
    </div>
  );
}

function CodeEditor({ value, onChange, lang = "javascript", minH = 200 }: { value: string; onChange: (v: string) => void; lang?: string; minH?: number }) {
  const lineCount = value.split("\n").length;
  return (
    <div style={{ border: "0.5px solid rgba(255,255,255,0.08)", borderRadius: 6, overflow: "hidden", background: "rgba(0,0,0,0.2)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 12px", borderBottom: "0.5px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)" }}>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace" }}>{lang}</span>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "monospace" }}>{lineCount} lines</span>
      </div>
      <div style={{ display: "flex" }}>
        <pre style={{ margin: 0, padding: "10px 8px", background: "rgba(255,255,255,0.02)", borderRight: "0.5px solid rgba(255,255,255,0.06)", fontSize: 11, lineHeight: "20px", color: "rgba(255,255,255,0.2)", fontFamily: "'JetBrains Mono', monospace", userSelect: "none", minWidth: 36, textAlign: "right" }}>
          {Array.from({ length: lineCount }, (_, i) => i + 1).join("\n")}
        </pre>
        <textarea value={value} onChange={(e) => onChange(e.target.value)} spellCheck={false} style={{ flex: 1, background: "transparent", border: "none", outline: "none", padding: "10px 12px", fontSize: 12, lineHeight: "20px", color: "rgba(255,255,255,0.8)", fontFamily: "'JetBrains Mono', monospace", resize: "none", minHeight: minH }} rows={Math.max(8, lineCount)} />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: number }) {
  const isOk = status < 300;
  const is3xx = status >= 300 && status < 400;
  const color = isOk ? "#1a9c52" : is3xx ? "#d97706" : "#dc2626";
  const label = isOk ? "OK" : is3xx ? "Redirect" : "Error";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 4, background: `${color}22`, border: `1px solid ${color}44`, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, color, letterSpacing: "0.05em" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
      {status} {label}
    </span>
  );
}

type ResponseShape = {
  status: number;
  time: number;
  size: string;
  body: string;
  headers: Record<string, string>;
};

export default function PostmanEndpoints() {
  const [state, setState] = useState<State>(initialState);
  const [tab, setTab] = useState("Params");
  const [methodOpen, setMethodOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [response, setResponse] = useState<ResponseShape | null>(null);
  const [respTab, setRespTab] = useState("Pretty");
  const [showToken, setShowToken] = useState(false);
  const [hideAuto, setHideAuto] = useState(false);
  const [scriptSub, setScriptSub] = useState("Pre-request");
  const [bodyKind, setBodyKind] = useState("none");
  const [rawLang, setRawLang] = useState("JSON");
  const [saved, setSaved] = useState(false);
  const methodRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (methodRef.current && !methodRef.current.contains(e.target as Node)) setMethodOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const upd = (patch: Partial<State>) => setState((s) => ({ ...s, ...patch }));

  const activeParams = state.params.filter((p) => p.enabled && p.key).length;
  const activeHeaders = state.headers.filter((h) => h.enabled && h.key).length;
  const hasAuth = state.authKind !== "none";
  const hasBody = bodyKind !== "none";
  const hasScripts = state.preScript.trim().length > 60 || state.postScript.trim().length > 60;

  const handleSend = () => {
    setSending(true);
    setResponse(null);
    setTimeout(() => {
      const sample = {
        ok: true,
        endpoint: state.url,
        data: [
          { id: "ep_1", name: "Billing — Invoices", method: "GET", url: "https://api.acme.io/v2/invoices", status: "drifted", drift_count: 3 },
          { id: "ep_2", name: "Auth — Session", method: "POST", url: "https://api.acme.io/v2/auth/session", status: "healthy", drift_count: 0 },
          { id: "ep_3", name: "Catalog — Products", method: "GET", url: "https://api.acme.io/v2/products", status: "healthy", drift_count: 0 },
        ],
        meta: { total: 3, page: 1, per_page: 20, generated_at: new Date().toISOString(), schema_version: "v1.4.2" },
      };
      setResponse({
        status: 200,
        time: 80 + Math.floor(Math.random() * 200),
        size: "1.20 KB",
        body: JSON.stringify(sample, null, 2),
        headers: {
          "content-type": "application/json; charset=utf-8",
          "x-request-id": "req_" + Math.random().toString(36).slice(2, 10),
          "cache-control": "no-store, no-cache",
          "x-response-time": "127ms",
          "x-schema-version": "v1.4.2",
        },
      });
      setSending(false);
    }, 800);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const TABS: { label: string; badge: React.ReactNode }[] = [
    { label: "Docs", badge: null },
    { label: "Params", badge: activeParams ? <CountPill>{activeParams}</CountPill> : null },
    { label: "Authorization", badge: hasAuth ? <Dot color="#1a9c52" /> : null },
    { label: "Headers", badge: <CountPill>{activeHeaders + (hideAuto ? 0 : AUTO_HEADERS.length)}</CountPill> },
    { label: "Body", badge: hasBody ? <Dot color="#d97706" /> : null },
    { label: "Scripts", badge: hasScripts ? <Dot color="#7c3aed" /> : null },
    { label: "Settings", badge: null },
  ];

  const mc = METHOD_COLORS[state.method] || METHOD_COLORS.GET;

  return (
    <div style={{ background: "#1a1a1a", minHeight: "100vh", color: "#e8e8e8", fontFamily: "'Inter', -apple-system, sans-serif", display: "flex", flexDirection: "column" }}>
      {/* TOP MULTI-TAB BAR */}
      <div style={{ background: "#141414", borderBottom: "1px solid rgba(255,255,255,0.06)", overflowX: "auto", display: "flex", alignItems: "center", gap: 0, minHeight: 38 }}>
        <div style={{ display: "flex", alignItems: "stretch", padding: "0 4px", gap: 2, flex: 1, overflowX: "auto" }}>
          {["SchemaGuard", "Get all endpoints"].map((label, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 14px", height: 38, cursor: "pointer", borderBottom: i === 1 ? "2px solid #ff6b35" : "none", background: i === 1 ? "rgba(255,255,255,0.04)" : "transparent", fontSize: 12, color: i === 1 ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.45)", whiteSpace: "nowrap", flexShrink: 0 }}>
              {i === 0 && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>}
              {i === 1 && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff6b35", display: "inline-block" }} />}
              {label}
              {i === 1 && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>}
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", padding: "0 10px", cursor: "pointer", color: "rgba(255,255,255,0.3)", fontSize: 18, height: 38 }}>+</div>
        </div>
      </div>

      {/* BREADCRUMB + TITLE BAR */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "#1a1a1a" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>SchemaGuard</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
          <input value={state.name} onChange={(e) => upd({ name: e.target.value })} style={{ background: "transparent", border: "none", outline: "none", fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.9)", letterSpacing: "-0.01em", minWidth: 0, flex: 1 }} />
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          <button onClick={handleSave} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 5, background: saved ? "rgba(26,156,82,0.15)" : "transparent", border: `1px solid ${saved ? "rgba(26,156,82,0.4)" : "rgba(255,255,255,0.12)"}`, color: saved ? "#1a9c52" : "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: 500, cursor: "pointer", transition: "all 0.2s" }}>
            {saved ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
            )}
            {saved ? "Saved!" : "Save"}
          </button>
          <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 5, background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
            Share
          </button>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* SIDEBAR */}
        <div style={{ width: 240, borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", background: "#161616", flexShrink: 0, overflowY: "auto" }}>
          <div style={{ padding: "10px 8px 4px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", paddingLeft: 4 }}>Collections</span>
            <div style={{ display: "flex", gap: 2 }}>
              <SideBtn icon="+" title="New" />
              <SideBtn icon="⋯" title="More" />
            </div>
          </div>
          <div style={{ padding: "4px 6px", position: "relative" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" style={{ position: "absolute", left: 18, top: "50%", transform: "translateY(-50%)" }}>
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input placeholder="Search" style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(255,255,255,0.08)", borderRadius: 5, padding: "5px 8px 5px 28px", fontSize: 11, color: "rgba(255,255,255,0.7)", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
          </div>
          <ColTree />
          <div style={{ marginTop: "auto", borderTop: "1px solid rgba(255,255,255,0.05)", padding: "6px 0" }}>
            {[{ label: "Environments" }, { label: "Specs" }, { label: "Flows" }].map((item) => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", cursor: "pointer", color: "rgba(255,255,255,0.4)", fontSize: 12 }} onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
          <div style={{ padding: "6px 10px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>Connect Git</span>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>Console</span>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>Terminal</span>
          </div>
        </div>

        {/* MAIN WORKSPACE */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* URL BAR */}
          <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", gap: 0, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, overflow: "hidden", transition: "border-color 0.2s" }}>
              <div ref={methodRef} style={{ position: "relative" }}>
                <button onClick={() => setMethodOpen((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 14px", height: 42, background: "transparent", border: "none", borderRight: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", color: mc.bg, minWidth: 96 }}>
                  {state.method}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                </button>
                {methodOpen && (
                  <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 100, background: "#242424", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, overflow: "hidden", minWidth: 180, boxShadow: "0 8px 32px rgba(0,0,0,0.5)", marginTop: 4 }}>
                    {METHODS.map((m) => {
                      const c = METHOD_COLORS[m];
                      return (
                        <div key={m} onClick={() => { upd({ method: m }); setMethodOpen(false); }} style={{ padding: "8px 14px", cursor: "pointer", fontSize: 12, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, letterSpacing: "0.06em", color: c.bg, background: state.method === m ? "rgba(255,255,255,0.07)" : "transparent", transition: "background 0.1s" }} onMouseEnter={(e) => { if (state.method !== m) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }} onMouseLeave={(e) => { if (state.method !== m) e.currentTarget.style.background = "transparent"; }}>{m}</div>
                      );
                    })}
                    <div style={{ borderTop: "0.5px solid rgba(255,255,255,0.07)", padding: 6 }}>
                      <input placeholder="Type a new method" style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "none", borderRadius: 4, padding: "5px 8px", fontSize: 11, color: "rgba(255,255,255,0.6)", outline: "none", fontFamily: "monospace", boxSizing: "border-box" }} />
                    </div>
                  </div>
                )}
              </div>
              <input value={state.url} onChange={(e) => upd({ url: e.target.value })} placeholder="Enter URL or paste text" style={{ flex: 1, background: "transparent", border: "none", outline: "none", padding: "0 14px", fontSize: 13, color: "rgba(255,255,255,0.85)", fontFamily: "'JetBrains Mono', monospace" }} />
              <div style={{ display: "flex", alignItems: "stretch" }}>
                <button onClick={handleSend} disabled={sending} style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 22px", background: "#2563eb", border: "none", cursor: sending ? "wait" : "pointer", fontSize: 13, fontWeight: 600, color: "#fff", transition: "all 0.15s", opacity: sending ? 0.7 : 1 }}>
                  {sending ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 0.8s linear infinite" }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                  )}
                  {sending ? "Sending" : "Send"}
                </button>
                <div style={{ width: 1, background: "rgba(255,255,255,0.1)" }} />
                <button style={{ display: "flex", alignItems: "center", padding: "0 10px", background: "#2563eb", border: "none", cursor: "pointer", color: "#fff" }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                </button>
              </div>
            </div>
          </div>

          {/* TABS */}
          <div style={{ display: "flex", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "0 16px", gap: 2, overflowX: "auto" }}>
            {TABS.map(({ label, badge }) => (
              <button key={label} onClick={() => setTab(label)} style={{ position: "relative", display: "flex", alignItems: "center", gap: 5, padding: "0 14px", height: 38, background: "transparent", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 500, color: tab === label ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.45)", whiteSpace: "nowrap", transition: "color 0.15s" }}>
                {label}
                {badge}
                {tab === label && <span style={{ position: "absolute", bottom: 0, left: 6, right: 6, height: 2, background: "#ff6b35", borderRadius: "2px 2px 0 0" }} />}
              </button>
            ))}
            <div style={{ marginLeft: "auto", paddingLeft: 10 }}>
              <button style={{ fontSize: 12, color: "#2563eb", background: "none", border: "none", cursor: "pointer" }}>Cookies</button>
            </div>
          </div>

          {/* TAB CONTENT */}
          <div style={{ flex: 1, overflow: "auto", padding: "14px 16px" }}>
            {tab === "Params" && (
              <div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 10, display: "flex", alignItems: "center", gap: 5 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                  Query params sync automatically with the URL
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Query Params</span>
                </div>
                <KVTable rows={state.params} setRows={(p) => upd({ params: p })} keyPh="Key" />
              </div>
            )}

            {tab === "Authorization" && (
              <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 20 }}>
                <div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Auth Type</div>
                  <select value={state.authKind} onChange={(e) => upd({ authKind: e.target.value })} style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "0.5px solid rgba(255,255,255,0.12)", borderRadius: 5, padding: "8px 10px", fontSize: 12, color: "rgba(255,255,255,0.8)", fontFamily: "inherit", outline: "none" }}>
                    {["none", "bearer", "basic", "apiKey", "oauth2"].map((k) => (
                      <option key={k} value={k} style={{ background: "#242424" }}>
                        {k === "none" ? "No Auth" : k === "bearer" ? "Bearer Token" : k === "basic" ? "Basic Auth" : k === "apiKey" ? "API Key" : "OAuth 2.0"}
                      </option>
                    ))}
                  </select>
                  <div style={{ marginTop: 14, fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
                    {state.authKind === "none" && "No authentication credentials will be sent."}
                    {state.authKind === "bearer" && "The authorization header will be automatically generated. Learn more about Bearer Token authorization."}
                    {state.authKind === "basic" && "Username & password are base64-encoded in the Authorization header."}
                    {state.authKind === "apiKey" && "API key sent as a header or query parameter on each request."}
                  </div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.02)", border: "0.5px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: 16 }}>
                  {state.authKind === "none" && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", textAlign: "center", padding: "20px 0" }}>No authentication selected.</div>}
                  {state.authKind === "bearer" && (
                    <div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Token</div>
                      <div style={{ display: "flex", border: `1.5px solid ${!state.bearer ? "#d97706" : "rgba(255,255,255,0.12)"}`, borderRadius: 5, overflow: "hidden", background: "rgba(255,255,255,0.04)", transition: "border-color 0.2s" }}>
                        <input type={showToken ? "text" : "password"} value={state.bearer} onChange={(e) => upd({ bearer: e.target.value })} placeholder="{{API_TOKEN}}" style={{ flex: 1, background: "transparent", border: "none", outline: "none", padding: "9px 12px", fontSize: 12, color: "rgba(255,255,255,0.8)", fontFamily: "'JetBrains Mono', monospace" }} />
                        <button onClick={() => setShowToken((v) => !v)} style={{ padding: "0 10px", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", borderLeft: "0.5px solid rgba(255,255,255,0.08)" }}>
                          {showToken ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                          )}
                        </button>
                        {!state.bearer && (
                          <div style={{ display: "flex", alignItems: "center", padding: "0 8px", color: "#d97706" }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                          </div>
                        )}
                      </div>
                      {!state.bearer && <div style={{ marginTop: 6, fontSize: 11, color: "#d97706" }}>⚠ Token is empty — add a token or use No Auth.</div>}
                    </div>
                  )}
                  {state.authKind === "basic" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <LabeledInput label="Username" placeholder="Username" />
                      <LabeledInput label="Password" type="password" placeholder="Password" />
                    </div>
                  )}
                  {state.authKind === "apiKey" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px", gap: 12 }}>
                      <LabeledInput label="Key" placeholder="X-Api-Key" />
                      <LabeledInput label="Value" placeholder="{{API_KEY}}" />
                      <div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Add to</div>
                        <select style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "0.5px solid rgba(255,255,255,0.12)", borderRadius: 5, padding: "8px 10px", fontSize: 12, color: "rgba(255,255,255,0.8)", fontFamily: "inherit", outline: "none" }}>
                          <option style={{ background: "#242424" }}>Header</option>
                          <option style={{ background: "#242424" }}>Query Params</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === "Headers" && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Headers</span>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "rgba(255,255,255,0.4)", cursor: "pointer" }}>
                    <input type="checkbox" checked={hideAuto} onChange={(e) => setHideAuto(e.target.checked)} style={{ accentColor: "#1a9c52" }} />
                    Hide auto-generated headers
                  </label>
                </div>
                <KVTable rows={state.headers} setRows={(h) => upd({ headers: h })} keyPh="Header" autoRows={AUTO_HEADERS} hideAuto={hideAuto} />
              </div>
            )}

            {tab === "Body" && (
              <div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 16, padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 6, border: "0.5px solid rgba(255,255,255,0.07)" }}>
                  {["none", "form-data", "x-www-form-urlencoded", "raw", "binary", "GraphQL"].map((k) => (
                    <label key={k} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: bodyKind === k ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.5)", cursor: "pointer" }} onClick={() => setBodyKind(k)}>
                      <div style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${bodyKind === k ? "#ff6b35" : "rgba(255,255,255,0.25)"}`, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
                        {bodyKind === k && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ff6b35" }} />}
                      </div>
                      <span>{k}</span>
                    </label>
                  ))}
                  {bodyKind === "raw" && (
                    <select value={rawLang} onChange={(e) => setRawLang(e.target.value)} style={{ marginLeft: "auto", background: "rgba(255,255,255,0.06)", border: "0.5px solid rgba(255,255,255,0.12)", borderRadius: 4, padding: "3px 8px", fontSize: 11, color: "rgba(255,255,255,0.7)", fontFamily: "inherit", outline: "none" }}>
                      {["JSON", "Text", "HTML", "XML", "JavaScript"].map((l) => (<option key={l} style={{ background: "#242424" }}>{l}</option>))}
                    </select>
                  )}
                </div>
                {bodyKind === "none" && <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>This request does not have a body</div>}
                {bodyKind === "raw" && <CodeEditor value={state.body.raw} onChange={(v) => upd({ body: { ...state.body, raw: v } })} lang={rawLang} />}
                {(bodyKind === "form-data" || bodyKind === "x-www-form-urlencoded") && <KVTable rows={[newKV()]} setRows={() => {}} keyPh="Field" />}
                {bodyKind === "binary" && (
                  <div style={{ padding: "40px", textAlign: "center", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 6, color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
                    Drop a file or <span style={{ color: "#2563eb", cursor: "pointer" }}>choose one</span> to upload as binary body
                  </div>
                )}
                {bodyKind === "GraphQL" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Query</div>
                      <CodeEditor value={"query {\n  endpoints(limit: 10) {\n    id\n    name\n    status\n    drift_count\n  }\n}"} onChange={() => {}} lang="GraphQL" minH={120} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Variables</div>
                      <CodeEditor value={"{\n  \n}"} onChange={() => {}} lang="JSON" minH={120} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === "Scripts" && (
              <div>
                <div style={{ display: "inline-flex", background: "rgba(255,255,255,0.05)", borderRadius: 6, padding: 3, marginBottom: 14 }}>
                  {["Pre-request", "Post-response"].map((s) => (
                    <button key={s} onClick={() => setScriptSub(s)} style={{ padding: "5px 14px", borderRadius: 4, background: scriptSub === s ? "rgba(255,255,255,0.1)" : "transparent", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 500, color: scriptSub === s ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)", transition: "all 0.15s" }}>{s}</button>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 10, lineHeight: 1.5 }}>
                  {scriptSub === "Pre-request" ? "JavaScript executed before each poll. Available: pm, req, env" : "Executed after response. Available: pm.test(), res, schema"}
                </div>
                {scriptSub === "Pre-request" ? (
                  <CodeEditor value={state.preScript} onChange={(v) => upd({ preScript: v })} lang="JavaScript" />
                ) : (
                  <CodeEditor value={state.postScript} onChange={(v) => upd({ postScript: v })} lang="JavaScript" />
                )}
              </div>
            )}

            {tab === "Settings" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                <SettingRow label="Follow Redirects">
                  <Toggle checked={state.settings.followRedirects} onChange={(v) => upd({ settings: { ...state.settings, followRedirects: v } })} />
                </SettingRow>
                <SettingRow label="SSL Verification">
                  <Toggle checked={state.settings.ssl} onChange={(v) => upd({ settings: { ...state.settings, ssl: v } })} />
                </SettingRow>
                <SettingRow label="Timeout (ms)">
                  <input type="number" value={state.settings.timeout} onChange={(e) => upd({ settings: { ...state.settings, timeout: parseInt(e.target.value) || 8000 } })} style={{ width: 90, background: "rgba(255,255,255,0.06)", border: "0.5px solid rgba(255,255,255,0.12)", borderRadius: 4, padding: "5px 8px", fontSize: 12, color: "rgba(255,255,255,0.8)", fontFamily: "'JetBrains Mono', monospace", outline: "none" }} />
                </SettingRow>
                <SettingRow label="Polling Interval (min)">
                  <input type="number" value={state.settings.interval} onChange={(e) => upd({ settings: { ...state.settings, interval: parseInt(e.target.value) || 5 } })} style={{ width: 70, background: "rgba(255,255,255,0.06)", border: "0.5px solid rgba(255,255,255,0.12)", borderRadius: 4, padding: "5px 8px", fontSize: 12, color: "rgba(255,255,255,0.8)", fontFamily: "'JetBrains Mono', monospace", outline: "none" }} />
                </SettingRow>
                <SettingRow label="Environment">
                  <select style={{ background: "rgba(255,255,255,0.06)", border: "0.5px solid rgba(255,255,255,0.12)", borderRadius: 4, padding: "5px 8px", fontSize: 12, color: "rgba(255,255,255,0.8)", fontFamily: "inherit", outline: "none" }}>
                    <option style={{ background: "#242424" }}>Production</option>
                    <option style={{ background: "#242424" }}>Staging</option>
                    <option style={{ background: "#242424" }}>Local</option>
                  </select>
                </SettingRow>
              </div>
            )}

            {tab === "Docs" && (
              <div style={{ maxWidth: 640 }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 10, lineHeight: 1.6 }}>
                  Document this endpoint. Use <code style={{ fontFamily: "monospace", background: "rgba(255,255,255,0.08)", padding: "1px 4px", borderRadius: 3 }}>{"{{VAR}}"}</code> for environment variables.
                </div>
                <CodeEditor value={`# ${state.name}\n\nDescribe what this endpoint returns, owners, SLAs, and any drift-handling notes.\n\n## Response Schema\n\n- \`data[]\` — Array of endpoint configs\n- \`meta.schema_version\` — Current baseline version\n`} onChange={() => {}} lang="Markdown" minH={280} />
              </div>
            )}
          </div>

          {/* RESPONSE PANEL */}
          {(sending || response) && (
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", background: "#161616", display: "flex", flexDirection: "column", maxHeight: "55%" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 16px", borderBottom: "0.5px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Response</span>
                {sending && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", animation: "pulse 1.2s ease-in-out infinite" }}>⏳ Sending request...</span>}
                {response && (
                  <>
                    <StatusBadge status={response.status} />
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Time: <span style={{ color: "rgba(255,255,255,0.8)", fontFamily: "monospace" }}>{response.time} ms</span></span>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Size: <span style={{ color: "rgba(255,255,255,0.8)", fontFamily: "monospace" }}>{response.size}</span></span>
                    <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                      <button style={{ padding: "3px 10px", background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(255,255,255,0.1)", borderRadius: 4, fontSize: 11, color: "rgba(255,255,255,0.6)", cursor: "pointer", fontFamily: "inherit" }}>Save Response</button>
                      <button onClick={() => setResponse(null)} style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(255,255,255,0.1)", borderRadius: 4, cursor: "pointer", color: "rgba(255,255,255,0.5)" }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      </button>
                    </div>
                  </>
                )}
              </div>

              {response && (
                <>
                  <div style={{ display: "flex", alignItems: "center", borderBottom: "0.5px solid rgba(255,255,255,0.06)", padding: "0 16px", flexShrink: 0 }}>
                    {["Pretty", "Raw", "Headers", "Test Results"].map((rt) => (
                      <button key={rt} onClick={() => setRespTab(rt)} style={{ position: "relative", padding: "0 14px", height: 34, background: "none", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 500, color: respTab === rt ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)", whiteSpace: "nowrap" }}>
                        {rt}
                        {respTab === rt && <span style={{ position: "absolute", bottom: 0, left: 6, right: 6, height: 2, background: "#ff6b35", borderRadius: "2px 2px 0 0" }} />}
                      </button>
                    ))}
                    <span style={{ marginLeft: "auto", fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.06em" }}>application/json</span>
                  </div>
                  <div style={{ overflowY: "auto", flex: 1 }}>
                    {respTab === "Pretty" && <PrettyJson json={response.body} />}
                    {respTab === "Raw" && (
                      <pre style={{ margin: 0, padding: "12px 16px", fontSize: 11, color: "rgba(255,255,255,0.7)", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{response.body}</pre>
                    )}
                    {respTab === "Headers" && (
                      <div style={{ padding: "10px 16px" }}>
                        {Object.entries(response.headers).map(([k, v]) => (
                          <div key={k} style={{ display: "flex", gap: 12, padding: "5px 0", borderBottom: "0.5px solid rgba(255,255,255,0.04)", fontSize: 12 }}>
                            <span style={{ color: "rgba(255,255,255,0.45)", fontFamily: "monospace", minWidth: 180 }}>{k}</span>
                            <span style={{ color: "rgba(255,255,255,0.7)", fontFamily: "monospace" }}>{v}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {respTab === "Test Results" && (
                      <div style={{ padding: "12px 16px" }}>
                        {[
                          { name: "Status 200", passed: true },
                          { name: "Response time < 500ms", passed: response.time < 500 },
                          { name: "Schema valid", passed: true },
                        ].map((t, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "0.5px solid rgba(255,255,255,0.04)", fontSize: 12 }}>
                            <span style={{ color: t.passed ? "#1a9c52" : "#dc2626", fontWeight: 700 }}>{t.passed ? "✓" : "✗"}</span>
                            <span style={{ color: t.passed ? "rgba(255,255,255,0.7)" : "#dc2626" }}>{t.name}</span>
                            <span style={{ marginLeft: "auto", fontSize: 10, color: t.passed ? "#1a9c52" : "#dc2626", fontFamily: "monospace", textTransform: "uppercase" }}>{t.passed ? "PASS" : "FAIL"}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ borderTop: "0.5px solid rgba(255,255,255,0.06)", padding: "8px 16px", flexShrink: 0 }}>
                    <details>
                      <summary style={{ cursor: "pointer", fontSize: 11, color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", gap: 6, listStyle: "none", userSelect: "none" }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1a9c52" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                        <span style={{ color: "#1a9c52", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>SchemaGuard</span>
                        <span style={{ color: "rgba(255,255,255,0.4)" }}>· Extracted schema from response</span>
                      </summary>
                      <SchemaPreview body={response.body} />
                    </details>
                  </div>
                </>
              )}

              {!response && !sending && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", gap: 12 }}>
                  {[
                    ["↗", "Send + Get a successful response"],
                    ["📊", "Send + Visualize response"],
                    ["🧪", "Send + Write tests"],
                  ].map(([icon, text]) => (
                    <div key={text} style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", gap: 8 }}>
                      <span>{icon}</span>
                      <span>{text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!sending && !response && (
            <div style={{ padding: "50px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5"><path d="M22 2L11 13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
              {[["Send + Get a successful response"], ["Send + Visualize response"], ["Send + Write tests"]].map(([text]) => (
                <div key={text} style={{ fontSize: 13, color: "rgba(255,255,255,0.2)" }}>{text}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        select option { background: #242424; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.18); }
        input::placeholder { color: rgba(255,255,255,0.25) !important; }
        textarea::placeholder { color: rgba(255,255,255,0.25) !important; }
        details summary::-webkit-details-marker { display: none; }
      `}</style>
    </div>
  );
}

function SideBtn({ icon, title }: { icon: string; title: string }) {
  return (
    <button title={title} style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.35)", fontSize: 16, borderRadius: 4 }} onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")} onMouseLeave={(e) => (e.currentTarget.style.background = "none")}>
      {icon}
    </button>
  );
}

function Dot({ color = "#1a9c52" }: { color?: string }) {
  return <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: color, marginLeft: 3 }} />;
}

function CountPill({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 18, height: 16, padding: "0 4px", borderRadius: 8, background: "rgba(255,255,255,0.1)", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.6)", fontFamily: "monospace", marginLeft: 4 }}>
      {children}
    </span>
  );
}

function LabeledInput({ label, placeholder, type = "text" }: { label: string; placeholder?: string; type?: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{label}</div>
      <input type={type} placeholder={placeholder} style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(255,255,255,0.12)", borderRadius: 5, padding: "8px 10px", fontSize: 12, color: "rgba(255,255,255,0.8)", fontFamily: "inherit", outline: "none" }} />
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button role="switch" aria-checked={checked} onClick={() => onChange(!checked)} style={{ width: 36, height: 20, borderRadius: 10, background: checked ? "#1a9c52" : "rgba(255,255,255,0.12)", border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
      <span style={{ position: "absolute", top: 2, left: checked ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
    </button>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 6, border: "0.5px solid rgba(255,255,255,0.07)" }}>
      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>{label}</span>
      {children}
    </div>
  );
}

type ColEndpoint = { name: string; method: string; active: boolean };
type Col = { id: string; name: string; endpoints: ColEndpoint[] };

function ColTree() {
  const [open, setOpen] = useState<Record<string, boolean>>({ sg: true, "SLA Testing": false, SMIV: false });
  const cols: Col[] = [
    {
      id: "sg", name: "SchemaGuard",
      endpoints: [
        { name: "Create endpoint", method: "POST", active: false },
        { name: "Get all endpoints", method: "GET", active: true },
        { name: "Get drift logs", method: "GET", active: false },
        { name: "Hit proxy for an endpoint", method: "GET", active: false },
        { name: "New Request", method: "GET", active: false },
      ],
    },
    { id: "SLA Testing", name: "SLA Testing", endpoints: [] },
    { id: "SMIV", name: "SMIV_APIs", endpoints: [] },
  ];
  return (
    <div style={{ padding: "0 6px" }}>
      {cols.map((col) => (
        <div key={col.id}>
          <div onClick={() => setOpen((o) => ({ ...o, [col.id]: !o[col.id] }))} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 8px", cursor: "pointer", borderRadius: 4, color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 500 }} onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transition: "transform 0.15s", transform: open[col.id] ? "rotate(90deg)" : "none" }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={open[col.id] ? "#d97706" : "rgba(255,255,255,0.4)"} strokeWidth="1.5">
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
            </svg>
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{col.name}</span>
          </div>
          {open[col.id] && col.endpoints.map((ep) => {
            const c = METHOD_COLORS[ep.method] || METHOD_COLORS.GET;
            return (
              <div key={ep.name} style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: 24, paddingRight: 8, height: 28, borderRadius: 4, cursor: "pointer", background: ep.active ? "rgba(255,107,53,0.12)" : "transparent", color: ep.active ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.55)", fontSize: 12 }} onMouseEnter={(e) => { if (!ep.active) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }} onMouseLeave={(e) => { if (!ep.active) e.currentTarget.style.background = "transparent"; }}>
                <span style={{ fontFamily: "monospace", fontSize: 10, fontWeight: 700, color: c.bg, minWidth: 30 }}>{ep.method}</span>
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ep.name}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function PrettyJson({ json }: { json: string }) {
  let parsed: any;
  try {
    parsed = JSON.parse(json);
  } catch {
    return <pre style={{ margin: 0, padding: "12px 16px", fontSize: 11, color: "rgba(255,255,255,0.7)", fontFamily: "monospace" }}>{json}</pre>;
  }
  return (
    <div style={{ padding: "10px 16px", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, lineHeight: "20px" }}>
      <JsonNode value={parsed} depth={0} isLast />
    </div>
  );
}

function JsonNode({ value, keyName, depth, isLast }: { value: any; keyName?: string | number; depth: number; isLast: boolean }) {
  const [open, setOpen] = useState(depth < 2);
  const pad = depth * 14;
  const rk = keyName !== undefined ? (
    <>
      <span style={{ color: "#7dd3fc" }}>"{keyName}"</span>
      <span style={{ color: "rgba(255,255,255,0.4)" }}>: </span>
    </>
  ) : null;
  const comma = !isLast ? <span style={{ color: "rgba(255,255,255,0.4)" }}>,</span> : null;

  if (value === null)
    return (
      <div style={{ paddingLeft: pad }}>
        {rk}
        <span style={{ color: "#fca5a5" }}>null</span>
        {comma}
      </div>
    );
  if (Array.isArray(value)) {
    return (
      <>
        <div style={{ paddingLeft: pad, cursor: "pointer" }} onClick={() => setOpen((v) => !v)}>
          <span style={{ color: "rgba(255,255,255,0.3)", marginRight: 4, fontSize: 10 }}>{open ? "▾" : "▸"}</span>
          {rk}
          <span style={{ color: "rgba(255,255,255,0.5)" }}>[</span>
          {!open && (
            <>
              <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 10 }}> {value.length} items </span>
              <span style={{ color: "rgba(255,255,255,0.5)" }}>]</span>
              {comma}
            </>
          )}
        </div>
        {open && value.map((v: any, i: number) => (
          <JsonNode key={i} value={v} keyName={i} depth={depth + 1} isLast={i === value.length - 1} />
        ))}
        {open && (
          <div style={{ paddingLeft: pad }}>
            <span style={{ color: "rgba(255,255,255,0.5)" }}>]</span>
            {comma}
          </div>
        )}
      </>
    );
  }
  if (typeof value === "object") {
    const entries = Object.entries(value);
    return (
      <>
        <div style={{ paddingLeft: pad, cursor: "pointer" }} onClick={() => setOpen((v) => !v)}>
          <span style={{ color: "rgba(255,255,255,0.3)", marginRight: 4, fontSize: 10 }}>{open ? "▾" : "▸"}</span>
          {rk}
          <span style={{ color: "rgba(255,255,255,0.5)" }}>{"{"}</span>
          {!open && (
            <>
              <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 10 }}> {entries.length} props </span>
              <span style={{ color: "rgba(255,255,255,0.5)" }}>{"}"}</span>
              {comma}
            </>
          )}
        </div>
        {open && entries.map(([k, v], i) => (
          <JsonNode key={k} value={v} keyName={k} depth={depth + 1} isLast={i === entries.length - 1} />
        ))}
        {open && (
          <div style={{ paddingLeft: pad }}>
            <span style={{ color: "rgba(255,255,255,0.5)" }}>{"}"}</span>
            {comma}
          </div>
        )}
      </>
    );
  }
  const clr = typeof value === "string" ? "#86efac" : typeof value === "number" ? "#fcd34d" : typeof value === "boolean" ? "#c4b5fd" : "rgba(255,255,255,0.7)";
  const disp = typeof value === "string" ? `"${value}"` : String(value);
  return (
    <div style={{ paddingLeft: pad }}>
      {rk}
      <span style={{ color: clr }}>{disp}</span>
      {comma}
    </div>
  );
}

function SchemaPreview({ body }: { body: string }) {
  let parsed: any;
  try {
    parsed = JSON.parse(body);
  } catch {
    return <div style={{ padding: "8px 0", fontSize: 11, color: "#dc2626" }}>Invalid JSON</div>;
  }
  const rows: { path: string; type: string }[] = [];
  const walk = (v: any, path: string) => {
    if (v === null) { rows.push({ path, type: "null" }); return; }
    if (Array.isArray(v)) { rows.push({ path, type: `array[${v.length}]` }); if (v[0]) walk(v[0], `${path}[0]`); return; }
    if (typeof v === "object") { Object.keys(v).forEach((k) => walk(v[k], path ? `${path}.${k}` : k)); return; }
    rows.push({ path, type: typeof v });
  };
  walk(parsed, "");
  return (
    <div style={{ marginTop: 8, maxHeight: 160, overflowY: "auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", borderBottom: "0.5px solid rgba(255,255,255,0.06)", padding: "3px 0", fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
        <span>Field</span>
        <span>Type</span>
      </div>
      {rows.slice(0, 12).map((r) => (
        <div key={r.path} style={{ display: "grid", gridTemplateColumns: "1fr 100px", padding: "3px 0", borderBottom: "0.5px solid rgba(255,255,255,0.03)", fontSize: 11 }}>
          <span style={{ fontFamily: "monospace", color: "rgba(255,255,255,0.65)" }}>{r.path}</span>
          <span style={{ fontFamily: "monospace", color: r.type === "string" ? "#86efac" : r.type.startsWith("number") || r.type === "number" ? "#fcd34d" : r.type === "boolean" ? "#c4b5fd" : "rgba(255,255,255,0.4)" }}>{r.type}</span>
        </div>
      ))}
    </div>
  );
}
