import type { Identity } from "../identity/types";
import type { GSIPAsset } from "../gsip/registry/types";
import type { AgentId, Profile } from "../icv/identity";
import type { AgentResult } from "../agents/contracts";
import type {
  AuditDecision,
  AuditRevision,
  ComplianceRecord,
} from "../compliance/contracts";
import type { PortalWorkspace } from "../portal/workspace";
import type { evaluateOpportunity } from "../markets/opportunities";
export type Opportunity = ReturnType<typeof evaluateOpportunity>;
export interface Agent {
  id: AgentId;
  identityId: string | null;
  initiativeIds: string[];
  status: string;
  result: AgentResult | null;
  lastRunAt: string | null;
}
export interface ComplianceState {
  records: ComplianceRecord[];
  decisions: (AuditDecision & { scope: "registry" | "factory" })[];
  status: "unreviewed" | "review" | "pass";
  unreviewedAssets: string[];
  reviewCount: number;
}
export interface Connections {
  version: 1;
  activeIdentityId: string | null;
  marketInitiatives: { marketId: string; initiativeId: string }[];
  assignments: { initiativeId: string; agentId: AgentId }[];
  agentIdentities: { agentId: AgentId; identityId: string }[];
  compliance: ComplianceRecord[];
  auditHistory: AuditRevision[];
}
export interface PortalSystemState {
  identities: Identity[];
  assets: GSIPAsset[];
  opportunities: Opportunity[];
  agents: Agent[];
  compliance: ComplianceState;
  workspace: PortalWorkspace;
  profile: Profile;
  connections: Connections;
  revenue: number;
  architecture: { nodes: number; edges: number };
  issues: string[];
  error: string;
  recovery: string | null;
}
