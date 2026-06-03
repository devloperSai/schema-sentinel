// Mock data + auth helpers (frontend-only). Replace with real API later.
export type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";
export type EndpointStatus = "healthy" | "drifted" | "paused";
export type Severity = "low" | "medium" | "high" | "critical";
export type AlertStatus = "unacknowledged" | "acknowledged" | "resolved";
export type ChangeType = "REMOVED" | "ADDED" | "TYPE_CHANGED";

export interface Endpoint {
  id: string;
  name: string;
  url: string;
  method: Method;
  intervalMin: number;
  headers?: Record<string, string>;
  status: EndpointStatus;
  lastCheckedAt: string;
  driftCount: number;
}

export interface DiffRow {
  changeType: ChangeType;
  field: string;
  baselineType: string;
  liveType: string;
}

export interface DriftLog {
  id: string;
  endpointId: string;
  endpointName: string;
  severity: Severity;
  detectedAt: string;
  status: AlertStatus;
  summary: string;
  diff: DiffRow[];
}

const now = Date.now();
const minsAgo = (m: number) => new Date(now - m * 60_000).toISOString();

export const mockEndpoints: Endpoint[] = [
  { id: "ep_1", name: "Billing — Invoices", url: "https://api.acme.io/v2/invoices", method: "GET", intervalMin: 5, status: "drifted", lastCheckedAt: minsAgo(2), driftCount: 3 },
  { id: "ep_2", name: "Auth — Session", url: "https://api.acme.io/v2/auth/session", method: "POST", intervalMin: 2, status: "healthy", lastCheckedAt: minsAgo(1), driftCount: 0 },
  { id: "ep_3", name: "Catalog — Products", url: "https://api.acme.io/v2/products", method: "GET", intervalMin: 10, status: "healthy", lastCheckedAt: minsAgo(7), driftCount: 0 },
  { id: "ep_4", name: "Analytics — Revenue", url: "https://api.acme.io/v2/analytics/revenue", method: "GET", intervalMin: 15, status: "drifted", lastCheckedAt: minsAgo(4), driftCount: 1 },
  { id: "ep_5", name: "Users — Directory", url: "https://api.acme.io/v2/users", method: "GET", intervalMin: 30, status: "paused", lastCheckedAt: minsAgo(120), driftCount: 0 },
  { id: "ep_6", name: "Webhook — Stripe", url: "https://api.acme.io/v2/webhooks/stripe", method: "POST", intervalMin: 5, status: "healthy", lastCheckedAt: minsAgo(3), driftCount: 0 },
];

export const mockDrifts: DriftLog[] = [
  {
    id: "d_1", endpointId: "ep_1", endpointName: "Billing — Invoices",
    severity: "critical", detectedAt: minsAgo(2), status: "unacknowledged",
    summary: "Field `amount` removed, replaced by `total_due`",
    diff: [
      { changeType: "REMOVED", field: "amount", baselineType: "number", liveType: "—" },
      { changeType: "ADDED", field: "total_due", baselineType: "—", liveType: "number" },
      { changeType: "TYPE_CHANGED", field: "currency", baselineType: "string", liveType: "object" },
    ],
  },
  {
    id: "d_2", endpointId: "ep_4", endpointName: "Analytics — Revenue",
    severity: "high", detectedAt: minsAgo(20), status: "unacknowledged",
    summary: "`revenue` changed from number → string",
    diff: [{ changeType: "TYPE_CHANGED", field: "revenue", baselineType: "number", liveType: "string" }],
  },
  {
    id: "d_3", endpointId: "ep_1", endpointName: "Billing — Invoices",
    severity: "medium", detectedAt: minsAgo(120), status: "acknowledged",
    summary: "Nested field `customer.tier` added",
    diff: [{ changeType: "ADDED", field: "customer.tier", baselineType: "—", liveType: "string" }],
  },
  {
    id: "d_4", endpointId: "ep_1", endpointName: "Billing — Invoices",
    severity: "low", detectedAt: minsAgo(360), status: "resolved",
    summary: "Optional field `notes` removed",
    diff: [{ changeType: "REMOVED", field: "notes", baselineType: "string", liveType: "—" }],
  },
  {
    id: "d_5", endpointId: "ep_2", endpointName: "Auth — Session",
    severity: "medium", detectedAt: minsAgo(720), status: "resolved",
    summary: "`expires_at` format shifted",
    diff: [{ changeType: "TYPE_CHANGED", field: "expires_at", baselineType: "number", liveType: "string" }],
  },
];

// --- Auth (mock, localStorage) ---
const TOKEN_KEY = "sg_token";
const USER_KEY = "sg_user";

export interface AuthUser { email: string; name: string }

export const auth = {
  getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
  },
  getUser(): AuthUser | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  login(email: string, name = email.split("@")[0]) {
    const token = "mock." + btoa(email + ":" + Date.now());
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify({ email, name }));
  },
  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

export function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
