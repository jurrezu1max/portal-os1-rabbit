import { founderAgent } from "./founder-agent";
import { researchAgent } from "./research-agent";
import { marketAgent } from "./market-agent";
import { strategyAgent } from "./strategy-agent";
import { complianceAgent } from "./compliance-agent";
import type { AgentId } from "../icv/identity";
import type { AgentInput, AgentResult } from "./contracts";
export const AGENTS: Record<AgentId, (input: AgentInput) => AgentResult> = {
  founder: founderAgent,
  research: researchAgent,
  market: marketAgent,
  strategy: strategyAgent,
  compliance: complianceAgent,
};
