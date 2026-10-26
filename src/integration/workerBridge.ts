import { object } from "../gsip/registry/types";
import { createContext } from "../icv/context";
import type { PortalSystemState } from "./types";
export const WORKER_ENDPOINTS = {
  icv: "api/icv",
  gsip: "api/gsip",
  markets: "api/markets",
  compliance: "api/compliance",
  store: "api/store",
} as const;
export type WorkerEndpoint = keyof typeof WORKER_ENDPOINTS;
export interface WorkerResponse {
  version: 1;
  data: unknown;
}
/** Worker responses are displayed as remote results, never merged into local stores. */
export function createWorkerBridge({
  baseUrl,
  fetcher = fetch,
  timeoutMs = 10000,
  endpoints = {},
}: {
  baseUrl: string;
  fetcher?: typeof fetch;
  timeoutMs?: number;
  endpoints?: Partial<Record<WorkerEndpoint, string>>;
}) {
  const base = new URL(baseUrl);
  if (
    !["https:", "http:"].includes(base.protocol) ||
    base.username ||
    base.password ||
    base.search ||
    base.hash
  )
    throw new Error(
      "Worker base URL must be HTTP(S), without credentials, query or fragment.",
    );
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 60000)
    throw new Error("Worker timeout must be 1–60,000 milliseconds.");
  if (!base.pathname.endsWith("/")) base.pathname += "/";
  const urls = Object.fromEntries(
    Object.entries(WORKER_ENDPOINTS).map(([key, path]) => {
      const relative = endpoints[key as WorkerEndpoint] ?? path;
      if (
        !/^[a-zA-Z0-9_/-]+$/.test(relative) ||
        relative.startsWith("/") ||
        relative.split("/").includes("..")
      )
        throw new Error("Worker endpoint overrides must be relative paths.");
      return [key, new URL(relative, base).toString()];
    }),
  ) as Record<WorkerEndpoint, string>;
  return {
    async request(
      endpoint: WorkerEndpoint,
      payload: unknown,
      signal?: AbortSignal,
    ): Promise<WorkerResponse> {
      if (!Object.hasOwn(WORKER_ENDPOINTS, endpoint))
        throw new Error("Unknown Worker endpoint.");
      const body = JSON.stringify({ version: 1, payload });
      if (body.length > 2_000_000)
        throw new Error("Worker payload exceeds 2 MB.");
      const controller = new AbortController();
      const abort = () => controller.abort();
      if (signal?.aborted) throw new Error("Worker request cancelled.");
      signal?.addEventListener("abort", abort, { once: true });
      const timer = setTimeout(abort, timeoutMs);
      try {
        const response = await fetcher(urls[endpoint], {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body,
          credentials: "omit",
          redirect: "error",
          signal: controller.signal,
        });
        if (!response.ok)
          throw new Error(
            `Worker ${endpoint} returned HTTP ${response.status}.`,
          );
        const raw = await response.text();
        if (raw.length > 2_000_000)
          throw new Error("Worker response exceeds 2 MB.");
        const result = object(JSON.parse(raw));
        if (result.version !== 1 || !Object.hasOwn(result, "data"))
          throw new Error("Worker response must contain version: 1 and data.");
        return { version: 1, data: result.data };
      } catch (error) {
        if (controller.signal.aborted)
          throw new Error("Worker request timed out or was cancelled.");
        throw error;
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener("abort", abort);
      }
    },
  };
}
export function workerPayload(
  endpoint: WorkerEndpoint,
  state: PortalSystemState,
  prompt: string,
) {
  switch (endpoint) {
    case "icv":
      return {
        context: createContext(
          "portal-system",
          state.workspace.name,
          state.workspace.project,
          state.workspace.goals,
          state.profile,
        ),
        prompt,
        evidence: state.workspace.observations,
      };
    case "gsip":
      return { assets: state.assets, identities: state.identities };
    case "markets":
      return {
        opportunities: state.opportunities,
        initiatives: state.workspace.initiatives,
        links: state.connections.marketInitiatives,
      };
    case "compliance":
      return {
        assets: state.assets,
        records: state.compliance.records,
        decisions: state.compliance.decisions,
      };
    case "store":
      return {
        assets: state.assets.filter((asset) =>
          ["Product", "Distribution", "Revenue", "Expansion"].includes(
            asset.status,
          ),
        ),
      };
  }
}
