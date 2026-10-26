import { identityRegistry, type IdentityRegistry } from "../identity/registry";
import {
  assetRegistry,
  type AssetRegistry,
} from "../gsip/registry/assetRegistry";
import {
  usePortal,
  validateComplianceRecord,
  type PortalWorkspace,
} from "../portal/workspace";
import { useWorkbench } from "../state/workbench";
import type { Architecture } from "../types";
import { AGENT_IDS, type AgentId } from "../icv/identity";
import { object, text, timestamp } from "../gsip/registry/types";
import type { Connections, PortalSystemState } from "./types";
import { identityProfile } from "./identityBridge";
import { connectedOpportunities } from "./marketBridge";
import { connectAssetMarket, registryComplianceWorkspace } from "./gsipBridge";
import { systemCompliance, reviseCompliance } from "./complianceBridge";
import {
  connectedAgents,
  executeConnectedAgents,
  type AgentRuns,
} from "./agentBridge";
export const INTEGRATION_STORAGE_KEY = "portal-os-connections-v1";
function agentId(value: unknown): AgentId {
  if (!AGENT_IDS.includes(value as AgentId))
    throw new Error("Unknown agent executor.");
  return value as AgentId;
}
function validateConnections(value: unknown): Connections {
  const row = object(value);
  if (row.version !== 1) throw new Error("Unsupported connection schema.");
  function rows<T>(
    value: unknown,
    read: (value: Record<string, unknown>) => T,
    key: (value: T) => string,
    limit = 200,
  ) {
    if (!Array.isArray(value) || value.length > limit)
      throw new Error("Invalid connection collection size.");
    const result = value.map((value) => read(object(value)));
    if (new Set(result.map(key)).size !== result.length)
      throw new Error("Duplicate connection records.");
    return result;
  }
  const compliance = rows(
    row.compliance,
    validateComplianceRecord,
    (record) => record.id,
  );
  const auditHistory = rows(
    row.auditHistory,
    (entry) => {
      if (
        entry.rulesVersion !== 1 ||
        !Number.isInteger(entry.revision) ||
        (entry.revision as number) < 1
      )
        throw new Error("Invalid audit revision.");
      return {
        revision: entry.revision as number,
        evaluatedAt: timestamp(entry.evaluatedAt),
        rulesVersion: 1 as const,
        record: validateComplianceRecord(entry.record),
      };
    },
    (entry) => JSON.stringify([entry.record.id, entry.revision]),
    2000,
  );
  const seen = new Map<string, number>();
  for (const entry of auditHistory) {
    const current = compliance.find((record) => record.id === entry.record.id);
    if (
      !current ||
      current.assetId !== entry.record.assetId ||
      entry.revision !== (seen.get(entry.record.id) ?? 0) + 1
    )
      throw new Error("Invalid audit history chain.");
    seen.set(entry.record.id, entry.revision);
  }
  for (const record of compliance) {
    const latest = auditHistory
      .filter((entry) => entry.record.id === record.id)
      .at(-1);
    if (!latest || JSON.stringify(latest.record) !== JSON.stringify(record))
      throw new Error("Audit history must match current evidence.");
  }
  return {
    version: 1,
    activeIdentityId:
      row.activeIdentityId === null ? null : text(row.activeIdentityId),
    marketInitiatives: rows(
      row.marketInitiatives,
      (link) => ({
        marketId: text(link.marketId),
        initiativeId: text(link.initiativeId),
      }),
      (link) => JSON.stringify([link.marketId, link.initiativeId]),
    ),
    assignments: rows(
      row.assignments,
      (link) => ({
        initiativeId: text(link.initiativeId),
        agentId: agentId(link.agentId),
      }),
      (link) => JSON.stringify([link.initiativeId, link.agentId]),
    ),
    agentIdentities: rows(
      row.agentIdentities,
      (link) => ({
        agentId: agentId(link.agentId),
        identityId: text(link.identityId),
      }),
      (link) => link.agentId,
    ),
    compliance,
    auditHistory,
  };
}
function freeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value as Record<string, unknown>).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
interface WorkspaceSource {
  getState: () => { data: PortalWorkspace; error: string };
  subscribe: (listener: () => void) => () => void;
}
interface GraphSource {
  getState: () => { graph: Architecture };
  subscribe: (listener: () => void) => () => void;
}
export function createPortalSystem({
  identities = identityRegistry,
  registry = assetRegistry,
  portal = usePortal,
  graph = useWorkbench,
  storage = null,
  now = () => new Date().toISOString(),
}: {
  identities?: IdentityRegistry;
  registry?: AssetRegistry;
  portal?: WorkspaceSource;
  graph?: GraphSource;
  storage?: Pick<Storage, "getItem" | "setItem"> | null;
  now?: () => string;
} = {}) {
  let connections: Connections = {
    version: 1,
    activeIdentityId: null,
    marketInitiatives: [],
    assignments: [],
    agentIdentities: [],
    compliance: [],
    auditHistory: [],
  };
  let error = "",
    recovery: string | null = null;
  try {
    recovery = storage?.getItem(INTEGRATION_STORAGE_KEY) ?? null;
    if (recovery !== null) {
      if (recovery.length > 2_000_000)
        throw new Error("Connection snapshot exceeds 2 MB.");
      connections = validateConnections(JSON.parse(recovery));
    }
    recovery = null;
  } catch {
    error =
      "Saved system connections could not be loaded. Writes are paused; download the original before replacing it.";
  }
  connections = freeze(connections);
  let runs: AgentRuns = {};
  const listeners = new Set<() => void>();
  let cached: PortalSystemState | undefined;
  let inputs: unknown[] = [];
  function getSnapshot(): PortalSystemState {
    const identityState = identities.getSnapshot(),
      registryState = registry.getSnapshot(),
      portalState = portal.getState(),
      graphState = graph.getState();
    const next = [
      identityState,
      registryState,
      portalState.data,
      portalState.error,
      graphState.graph,
      connections,
      runs,
      error,
    ];
    if (cached && next.every((value, index) => value === inputs[index]))
      return cached;
    const workspace = portalState.data;
    const issues = [
      identityState.error,
      registryState.error,
      portalState.error,
    ].filter(Boolean);
    if (
      connections.activeIdentityId &&
      !identityState.identities.some(
        (identity) => identity.id === connections.activeIdentityId,
      )
    )
      issues.push(
        "Active identity is missing; ICV uses the workspace profile until repaired.",
      );
    for (const asset of registryState.assets) {
      if (
        !identityState.identities.some(
          (identity) => identity.id === asset.ownerId,
        )
      )
        issues.push(`Missing owner for ${asset.title}.`);
      if (!workspace.markets.some((market) => market.id === asset.market))
        issues.push(`Choose a market link for ${asset.title}.`);
    }
    for (const link of connections.marketInitiatives)
      if (
        !workspace.markets.some((market) => market.id === link.marketId) ||
        !workspace.initiatives.some(
          (initiative) => initiative.id === link.initiativeId,
        )
      )
        issues.push(
          `Broken market / PMD link: ${link.marketId} / ${link.initiativeId}.`,
        );
    for (const link of connections.assignments)
      if (
        !workspace.initiatives.some(
          (initiative) => initiative.id === link.initiativeId,
        )
      )
        issues.push(`Missing PMD initiative assigned to ${link.agentId}.`);
    for (const link of connections.agentIdentities)
      if (
        !identityState.identities.some(
          (identity) =>
            identity.id === link.identityId && identity.type === "agent",
        )
      )
        issues.push(`Missing agent identity for ${link.agentId}.`);
    for (const record of connections.compliance)
      if (!registryState.assets.some((asset) => asset.id === record.assetId))
        issues.push(`Missing registry asset for audit ${record.id}.`);
    inputs = next;
    cached = freeze(
      structuredClone({
        identities: identityState.identities,
        assets: registryState.assets,
        opportunities: connectedOpportunities(workspace),
        agents: connectedAgents(
          workspace,
          identityState.identities,
          registryState.assets,
          connections,
          runs,
        ),
        compliance: systemCompliance(
          registryState.assets,
          connections.compliance,
          workspace,
          identityState.identities,
        ),
        workspace,
        profile: identityProfile(
          identityState.identities,
          connections.activeIdentityId,
          workspace.profile,
        ),
        connections,
        revenue: registry.getMetrics().revenueGenerated,
        architecture: {
          nodes: graphState.graph.nodes.length,
          edges: graphState.graph.edges.length,
        },
        issues,
        error,
        recovery,
      }),
    );
    return cached;
  }
  function save(next: Connections, replace = false) {
    if (error && !replace) throw new Error(error);
    const checked = validateConnections(next),
      serialized = JSON.stringify(checked);
    if (serialized.length > 2_000_000)
      throw new Error("Connection snapshot exceeds 2 MB.");
    try {
      storage?.setItem(INTEGRATION_STORAGE_KEY, serialized);
    } catch {
      throw new Error(
        "Unable to save system connections. Export and retry when browser storage is available.",
      );
    }
    connections = freeze(checked);
    error = "";
    recovery = null;
    listeners.forEach((listener) => listener());
  }
  return {
    getSnapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      const unsubscribe = [
        identities.subscribe(listener),
        registry.subscribe(listener),
        portal.subscribe(listener),
        graph.subscribe(listener),
      ];
      return () => {
        listeners.delete(listener);
        unsubscribe.forEach((stop) => stop());
      };
    },
    selectIdentity(id: string | null) {
      if (id !== null && !identities.findIdentity(id))
        throw new Error("Identity not found.");
      save({ ...connections, activeIdentityId: id });
    },
    linkAsset(assetId: string, marketId: string) {
      return connectAssetMarket(
        registry,
        portal.getState().data,
        assetId,
        marketId,
      );
    },
    linkInitiative(marketId: string, initiativeId: string) {
      const workspace = portal.getState().data;
      if (
        !workspace.markets.some((market) => market.id === marketId) ||
        !workspace.initiatives.some(
          (initiative) => initiative.id === initiativeId,
        )
      )
        throw new Error("Select an existing market and PMD initiative.");
      save({
        ...connections,
        marketInitiatives: [
          ...connections.marketInitiatives.filter(
            (link) =>
              link.marketId !== marketId || link.initiativeId !== initiativeId,
          ),
          { marketId, initiativeId },
        ],
      });
    },
    unlinkInitiative(marketId: string, initiativeId: string) {
      save({
        ...connections,
        marketInitiatives: connections.marketInitiatives.filter(
          (link) =>
            link.marketId !== marketId || link.initiativeId !== initiativeId,
        ),
      });
    },
    assignAgent(initiativeId: string, id: AgentId) {
      agentId(id);
      if (
        !portal
          .getState()
          .data.initiatives.some((initiative) => initiative.id === initiativeId)
      )
        throw new Error("PMD initiative not found.");
      save({
        ...connections,
        assignments: [
          ...connections.assignments.filter(
            (link) => link.initiativeId !== initiativeId || link.agentId !== id,
          ),
          { initiativeId, agentId: id },
        ],
      });
    },
    unassignAgent(initiativeId: string, id: AgentId) {
      save({
        ...connections,
        assignments: connections.assignments.filter(
          (link) => link.initiativeId !== initiativeId || link.agentId !== id,
        ),
      });
    },
    bindAgent(id: AgentId, identityId: string) {
      agentId(id);
      if (identities.findIdentity(identityId)?.type !== "agent")
        throw new Error("Select an identity of type agent.");
      save({
        ...connections,
        agentIdentities: [
          ...connections.agentIdentities.filter((link) => link.agentId !== id),
          { agentId: id, identityId },
        ],
      });
    },
    unbindAgent(id: AgentId) {
      save({
        ...connections,
        agentIdentities: connections.agentIdentities.filter(
          (link) => link.agentId !== id,
        ),
      });
    },
    runAgents(prompt: string) {
      const workspace = portal.getState().data;
      runs = executeConnectedAgents(
        prompt,
        workspace,
        identities.listIdentities(),
        registry.listAssets(),
        connections,
        now(),
      );
      listeners.forEach((listener) => listener());
      return Object.fromEntries(
        AGENT_IDS.map((id) => [id, structuredClone(runs[id]!.result)]),
      );
    },
    registryWorkspace: () =>
      registryComplianceWorkspace(
        portal.getState().data,
        registry,
        identities.listIdentities(),
        connections,
      ),
    updateRegistryCompliance(
      change: (workspace: PortalWorkspace) => PortalWorkspace,
    ) {
      const current = registryComplianceWorkspace(
        portal.getState().data,
        registry,
        identities.listIdentities(),
        connections,
      );
      const candidate = change(structuredClone(current));
      const revision = reviseCompliance(
        candidate.compliance,
        connections.compliance,
        connections.auditHistory,
        registry.listAssets().map((asset) => asset.id),
        timestamp(now()),
      );
      save({ ...connections, ...revision });
    },
    exportConnections: () => JSON.stringify(connections, null, 2),
    replaceSaved: () => save(connections, true),
  };
}
export type PortalSystem = ReturnType<typeof createPortalSystem>;
export const portalSystem = createPortalSystem({
  storage:
    typeof window === "undefined"
      ? null
      : {
          getItem: (key) => window.localStorage.getItem(key),
          setItem: (key, value) => window.localStorage.setItem(key, value),
        },
});
