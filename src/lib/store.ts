// Lightweight reactive store (useSyncExternalStore) for collections, endpoints, environments.
import { useSyncExternalStore } from "react";
import {
  mockEndpoints as seedEndpoints,
  type Endpoint,
  type Method,
} from "./mock";

export type AuthKind = "none" | "bearer" | "apiKey" | "basic";
export type BodyKind = "none" | "json" | "form-data" | "x-www-form-urlencoded" | "raw";
export type KV = { id: string; key: string; value: string; enabled: boolean };

export interface EndpointConfig extends Endpoint {
  collectionId: string | null;
  timeoutMs: number;
  followRedirects: boolean;
  sslVerify: boolean;
  tags: string[];
  environmentId: string | null;
  params: KV[];
  headersKv: KV[];
  auth: {
    kind: AuthKind;
    bearer?: string;
    apiKey?: { key: string; value: string; in: "header" | "query" };
    basic?: { user: string; pass: string };
  };
  body: { kind: BodyKind; json?: string; raw?: string; form?: KV[]; urlencoded?: KV[] };
  preScript: string;
}

export interface Collection {
  id: string;
  parentId: string | null;
  name: string;
  expanded: boolean;
}

export interface EnvVar { id: string; key: string; value: string; enabled: boolean; secret: boolean }
export interface Environment {
  id: string;
  name: string;
  variables: EnvVar[];
}

// ─── Initial state ──────────────────────────────────────────────────────────
const uid = (p = "id") => `${p}_${Math.random().toString(36).slice(2, 9)}`;

const seedCollections: Collection[] = [
  { id: "col_billing", parentId: null, name: "Billing", expanded: true },
  { id: "col_billing_v2", parentId: "col_billing", name: "v2", expanded: true },
  { id: "col_core", parentId: null, name: "Core Platform", expanded: true },
  { id: "col_core_auth", parentId: "col_core", name: "Auth", expanded: true },
  { id: "col_core_catalog", parentId: "col_core", name: "Catalog", expanded: false },
  { id: "col_analytics", parentId: null, name: "Analytics", expanded: false },
  { id: "col_webhooks", parentId: null, name: "Webhooks", expanded: false },
];

const collectionMap: Record<string, string> = {
  ep_1: "col_billing_v2",
  ep_2: "col_core_auth",
  ep_3: "col_core_catalog",
  ep_4: "col_analytics",
  ep_5: "col_core",
  ep_6: "col_webhooks",
};

function expand(e: Endpoint): EndpointConfig {
  return {
    ...e,
    collectionId: collectionMap[e.id] ?? null,
    timeoutMs: 8000,
    followRedirects: true,
    sslVerify: true,
    tags: [],
    environmentId: "env_prod",
    params: [],
    headersKv: Object.entries(e.headers ?? {}).map(([key, value]) => ({
      id: uid("kv"), key, value, enabled: true,
    })),
    auth: { kind: "bearer", bearer: "{{API_TOKEN}}" },
    body: { kind: "none", json: "{\n  \n}", raw: "" },
    preScript: "// Runs before each poll. Available: req, env, console\n// req.headers['X-Trace'] = crypto.randomUUID();\n",
  };
}

const seedEnvironments: Environment[] = [
  {
    id: "env_prod", name: "Production", variables: [
      { id: uid("v"), key: "BASE_URL", value: "https://api.acme.io", enabled: true, secret: false },
      { id: uid("v"), key: "API_TOKEN", value: "sk_live_••••••••••••", enabled: true, secret: true },
      { id: uid("v"), key: "TENANT", value: "acme", enabled: true, secret: false },
    ],
  },
  {
    id: "env_staging", name: "Staging", variables: [
      { id: uid("v"), key: "BASE_URL", value: "https://staging.acme.io", enabled: true, secret: false },
      { id: uid("v"), key: "API_TOKEN", value: "sk_test_••••••••••••", enabled: true, secret: true },
    ],
  },
  {
    id: "env_local", name: "Local", variables: [
      { id: uid("v"), key: "BASE_URL", value: "http://localhost:3000", enabled: true, secret: false },
    ],
  },
];

interface State {
  collections: Collection[];
  endpoints: EndpointConfig[];
  environments: Environment[];
  activeEnvId: string;
}

let state: State = {
  collections: seedCollections,
  endpoints: seedEndpoints.map(expand),
  environments: seedEnvironments,
  activeEnvId: "env_prod",
};

const listeners = new Set<() => void>();
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const emit = () => listeners.forEach((l) => l());
const getState = () => state;
const setState = (patch: Partial<State> | ((s: State) => Partial<State>)) => {
  const p = typeof patch === "function" ? patch(state) : patch;
  state = { ...state, ...p };
  emit();
};

export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => sel(state), () => sel(state));
}

// ─── Actions ────────────────────────────────────────────────────────────────
export const store = {
  // Collections
  addCollection(parentId: string | null, name = "New collection") {
    const c: Collection = { id: uid("col"), parentId, name, expanded: true };
    setState((s) => ({ collections: [...s.collections, c] }));
    return c.id;
  },
  renameCollection(id: string, name: string) {
    setState((s) => ({ collections: s.collections.map((c) => c.id === id ? { ...c, name } : c) }));
  },
  toggleCollection(id: string) {
    setState((s) => ({ collections: s.collections.map((c) => c.id === id ? { ...c, expanded: !c.expanded } : c) }));
  },
  deleteCollection(id: string) {
    // Cascade: collect descendant ids
    const all = state.collections;
    const ids = new Set<string>([id]);
    let added = true;
    while (added) {
      added = false;
      for (const c of all) if (c.parentId && ids.has(c.parentId) && !ids.has(c.id)) { ids.add(c.id); added = true; }
    }
    setState((s) => ({
      collections: s.collections.filter((c) => !ids.has(c.id)),
      endpoints: s.endpoints.map((e) => ids.has(e.collectionId ?? "") ? { ...e, collectionId: null } : e),
    }));
  },
  moveCollection(id: string, parentId: string | null) {
    if (id === parentId) return;
    setState((s) => ({ collections: s.collections.map((c) => c.id === id ? { ...c, parentId } : c) }));
  },

  // Endpoints
  moveEndpoint(id: string, collectionId: string | null) {
    setState((s) => ({ endpoints: s.endpoints.map((e) => e.id === id ? { ...e, collectionId } : e) }));
  },
  deleteEndpoint(id: string) {
    setState((s) => ({ endpoints: s.endpoints.filter((e) => e.id !== id) }));
  },
  toggleEndpointStatus(id: string) {
    setState((s) => ({ endpoints: s.endpoints.map((e) => e.id === id
      ? { ...e, status: e.status === "paused" ? "healthy" : "paused" } : e) }));
  },
  upsertEndpoint(ep: EndpointConfig) {
    setState((s) => {
      const exists = s.endpoints.some((x) => x.id === ep.id);
      return { endpoints: exists ? s.endpoints.map((x) => x.id === ep.id ? ep : x) : [ep, ...s.endpoints] };
    });
  },
  newEndpointTemplate(collectionId: string | null = null): EndpointConfig {
    return {
      id: uid("ep"),
      name: "Untitled request",
      url: "{{BASE_URL}}/",
      method: "GET" as Method,
      intervalMin: 5,
      status: "healthy",
      lastCheckedAt: new Date().toISOString(),
      driftCount: 0,
      collectionId,
      timeoutMs: 8000,
      followRedirects: true,
      sslVerify: true,
      tags: [],
      environmentId: state.activeEnvId,
      params: [{ id: uid("kv"), key: "", value: "", enabled: true }],
      headersKv: [{ id: uid("kv"), key: "Accept", value: "application/json", enabled: true }],
      auth: { kind: "none" },
      body: { kind: "none", json: "{\n  \n}", raw: "" },
      preScript: "// Runs before each poll. Available: req, env, console\n",
    };
  },

  // Environments
  activateEnv(id: string) { setState({ activeEnvId: id }); },
  addEnvironment(name: string) {
    const e: Environment = { id: uid("env"), name, variables: [] };
    setState((s) => ({ environments: [...s.environments, e] }));
    return e.id;
  },
  deleteEnvironment(id: string) {
    setState((s) => ({
      environments: s.environments.filter((e) => e.id !== id),
      activeEnvId: s.activeEnvId === id ? (s.environments.find((e) => e.id !== id)?.id ?? "") : s.activeEnvId,
    }));
  },
  updateEnvironment(id: string, patch: Partial<Environment>) {
    setState((s) => ({ environments: s.environments.map((e) => e.id === id ? { ...e, ...patch } : e) }));
  },
  addEnvVar(envId: string) {
    const v: EnvVar = { id: uid("v"), key: "", value: "", enabled: true, secret: false };
    setState((s) => ({ environments: s.environments.map((e) => e.id === envId ? { ...e, variables: [...e.variables, v] } : e) }));
  },
  updateEnvVar(envId: string, varId: string, patch: Partial<EnvVar>) {
    setState((s) => ({ environments: s.environments.map((e) => e.id === envId
      ? { ...e, variables: e.variables.map((v) => v.id === varId ? { ...v, ...patch } : v) } : e) }));
  },
  deleteEnvVar(envId: string, varId: string) {
    setState((s) => ({ environments: s.environments.map((e) => e.id === envId
      ? { ...e, variables: e.variables.filter((v) => v.id !== varId) } : e) }));
  },
};

export const utils = {
  newKV: (): KV => ({ id: uid("kv"), key: "", value: "", enabled: true }),
  /** Sync params <-> URL query string. */
  paramsToUrl(url: string, params: KV[]): string {
    const [base] = url.split("?");
    const qs = params.filter((p) => p.enabled && p.key)
      .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join("&");
    return qs ? `${base}?${qs}` : base;
  },
  urlToParams(url: string): KV[] {
    const q = url.split("?")[1];
    if (!q) return [];
    return q.split("&").filter(Boolean).map((seg) => {
      const [k, v = ""] = seg.split("=");
      return { id: uid("kv"), key: decodeURIComponent(k), value: decodeURIComponent(v), enabled: true };
    });
  },
  /** Resolve {{VAR}} tokens using the active env. */
  resolve(input: string, env: Environment | undefined): string {
    if (!env) return input;
    return input.replace(/\{\{(\w+)\}\}/g, (_, k) => {
      const v = env.variables.find((x) => x.enabled && x.key === k);
      return v ? v.value : `{{${k}}}`;
    });
  },
};
