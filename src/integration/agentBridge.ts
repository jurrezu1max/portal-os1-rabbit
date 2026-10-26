import { AGENTS } from "../agents/registry";
import type { AgentInput, AgentResult } from "../agents/contracts";
import { AGENT_IDS, type AgentId } from "../icv/identity";
import { createContext } from "../icv/context";
import { systemCompliance } from "./complianceBridge";
import type { ComplianceState } from "./types";
import { identityProfile } from "./identityBridge";
import type { Identity } from "../identity/types";
import type { GSIPAsset } from "../gsip/registry/types";
import type { PortalWorkspace } from "../portal/workspace";
import type { Agent, Connections } from "./types";
export interface AgentRun {
  result: AgentResult;
  inputKey: string;
  prompt: string;
  at: string;
}
export type AgentRuns = Partial<Record<AgentId, AgentRun>>;
export function connectedAgentInput(
  id: AgentId,
  prompt: string,
  workspace: PortalWorkspace,
  identities: Identity[],
  assets: GSIPAsset[],
  connections: Connections,
): AgentInput & { complianceState: ComplianceState } {
  const assigned = connections.assignments.some((link) => link.agentId === id);
  const initiatives = workspace.initiatives.filter((initiative) =>
    connections.assignments.some(
      (link) => link.agentId === id && link.initiativeId === initiative.id,
    ),
  );
  const marketIds = connections.marketInitiatives
    .filter((link) =>
      initiatives.some((initiative) => initiative.id === link.initiativeId),
    )
    .map((link) => link.marketId);
  const markets = workspace.markets.filter(
    (market) => !assigned || marketIds.includes(market.id),
  );
  const scopedAssets = assets.filter(
    (asset) => !assigned || marketIds.includes(asset.market),
  );
  const identityId =
    connections.agentIdentities.find((link) => link.agentId === id)
      ?.identityId ?? connections.activeIdentityId;
  const profile = identityProfile(identities, identityId, workspace.profile);
  const legacyAssets = workspace.assets.filter(
    (asset) => !assigned || marketIds.includes(asset.marketId),
  );
  const legacyRecords = workspace.compliance.filter((record) =>
    legacyAssets.some((asset) => asset.id === record.assetId),
  );
  const registryRecords = connections.compliance.filter(
    (record) =>
      !assigned || scopedAssets.some((asset) => asset.id === record.assetId),
  );
  const coverage = systemCompliance(
    scopedAssets,
    registryRecords,
    { ...workspace, assets: legacyAssets, compliance: legacyRecords },
    identities,
  );
  return {
    complianceState: coverage,
    context: createContext(
      "portal-system",
      workspace.name,
      workspace.project,
      workspace.goals,
      profile,
    ),
    prompt: [
      prompt,
      ...initiatives.map(
        (initiative) =>
          `PMD ${initiative.domain}: ${initiative.title}; ${initiative.status}; readiness ${initiative.readinessScore}%; alignment ${initiative.alignmentScore}%`,
      ),
    ].join("\n"),
    evidence: workspace.observations,
    markets,
    compliance: [
      ...workspace.compliance.filter(
        (record) =>
          !assigned ||
          workspace.assets.some(
            (asset) =>
              asset.id === record.assetId && marketIds.includes(asset.marketId),
          ),
      ),
      ...connections.compliance.filter((record) =>
        scopedAssets.some((asset) => asset.id === record.assetId),
      ),
    ],
    missions: [
      ...workspace.missions,
      ...initiatives.map((initiative) => ({
        id: `pmd:${initiative.id}`,
        title: `${initiative.title} (${initiative.status})`,
        owner: initiative.owner,
        priority: initiative.priority,
        status:
          initiative.status === "complete"
            ? ("complete" as const)
            : ("active" as const),
      })),
    ],
  };
}
export function executeConnectedAgents(
  prompt: string,
  workspace: PortalWorkspace,
  identities: Identity[],
  assets: GSIPAsset[],
  connections: Connections,
  at: string,
): AgentRuns {
  if (!prompt.trim() || prompt.length > 20000)
    throw new Error("Provide an agent prompt of 1–20,000 characters.");
  return Object.fromEntries(
    AGENT_IDS.map((id) => {
      const input = connectedAgentInput(
        id,
        prompt,
        workspace,
        identities,
        assets,
        connections,
      );
      const result = AGENTS[id](input);
      if (id === "compliance" && input.complianceState.status !== "pass") {
        result.status = "needs-evidence";
        result.confidence = 0;
        result.reasoning.push(
          ...input.complianceState.unreviewedAssets.map(
            (asset) => "No audit evidence: " + asset,
          ),
          ...input.complianceState.decisions
            .filter((decision) => decision.status === "review")
            .flatMap((decision) => decision.reasons),
        );
        result.actions.push(
          "Resolve missing evidence and current ownership findings in Compliance Console.",
        );
      }
      return [id, { result, inputKey: JSON.stringify(input), prompt, at }];
    }),
  );
}
export function connectedAgents(
  workspace: PortalWorkspace,
  identities: Identity[],
  assets: GSIPAsset[],
  connections: Connections,
  runs: AgentRuns,
): Agent[] {
  return AGENT_IDS.map((id) => {
    const run = runs[id];
    return {
      id,
      identityId:
        connections.agentIdentities.find((link) => link.agentId === id)
          ?.identityId ?? null,
      initiativeIds: connections.assignments
        .filter((link) => link.agentId === id)
        .map((link) => link.initiativeId),
      status: !run
        ? "idle"
        : run.inputKey !==
            JSON.stringify(
              connectedAgentInput(
                id,
                run.prompt,
                workspace,
                identities,
                assets,
                connections,
              ),
            )
          ? "stale"
          : run.result.status,
      result: run?.result ?? null,
      lastRunAt: run?.at ?? null,
    };
  });
}
