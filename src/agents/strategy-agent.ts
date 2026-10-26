import { planAction } from "../icv/strategy";
import { recommendation, type AgentInput } from "./contracts";
export function strategyAgent(input: AgentInput) {
  const plan = planAction(input.prompt, input.context, input.evidence);
  const ready =
    plan.verification.valid &&
    input.evidence.length > 0 &&
    !plan.coherence.conflicts.length &&
    input.prompt.trim().length > 0;
  return recommendation(
    [...plan.coherence.reasoning, ...plan.coherence.conflicts],
    plan.actions,
    ready ? 1 : 0,
    1,
  );
}
