import { auditCompliance } from "../compliance/audit";
import { recommendation, type AgentInput } from "./contracts";
export function complianceAgent(input: AgentInput) {
  const decisions = input.compliance.flatMap(auditCompliance);
  const issues = decisions.filter((d) => d.status === "review");
  return recommendation(
    decisions.map(
      (d) => `${d.recordId} / ${d.rule} v${d.version}: ${d.status}`,
    ),
    issues.length
      ? issues.flatMap((d) => d.reasons)
      : ["Request human review of compliance evidence."],
    decisions.filter((d) => d.status === "pass").length,
    Math.max(5, decisions.length),
  );
}
