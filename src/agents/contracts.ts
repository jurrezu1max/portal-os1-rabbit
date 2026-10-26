import type { Observation } from "../portal/contracts";
import type { Context } from "../icv/context";
import type { MarketInput } from "../markets/scanner";
import type { ComplianceRecord } from "../compliance/contracts";
import type { MissionAction } from "../mission/planning";
export interface AgentResult {
  status: string;
  confidence: number;
  reasoning: string[];
  actions: string[];
}
export interface AgentInput {
  context: Context;
  prompt: string;
  evidence: Observation[];
  markets: MarketInput[];
  compliance: ComplianceRecord[];
  missions: MissionAction[];
}
/** Confidence is evidence completeness, never a probability of truth. */
export function recommendation(
  reasoning: string[],
  actions: string[],
  supported: number,
  required: number,
): AgentResult {
  return {
    status: supported >= required ? "ready-for-review" : "needs-evidence",
    confidence:
      required > 0 ? Math.max(0, Math.min(1, supported / required)) : 0,
    reasoning,
    actions,
  };
}
