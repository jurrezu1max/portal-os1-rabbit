import { evaluateOpportunity } from "../markets/opportunities";
import { recommendation, type AgentInput } from "./contracts";
export function marketAgent(input: AgentInput) {
  const ranked = input.markets
    .map(evaluateOpportunity)
    .sort((a, b) => b.opportunityScore - a.opportunityScore);
  return recommendation(
    ranked.map(
      (m) =>
        `${m.name}: ${m.opportunityScore.toFixed(2)}/100 — ${m.source} (${m.observedAt})`,
    ),
    ranked.length
      ? [`Validate assumptions for ${ranked[0].name}.`]
      : ["Record a sourced market estimate."],
    ranked.length ? 1 : 0,
    1,
  );
}
