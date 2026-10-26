import { sizeMarket } from "./tam";
import { marketTrends } from "./trends";
import { forecastMarket } from "./forecast";
import type { MarketInput } from "./scanner";
export function evaluateOpportunity(input: MarketInput) {
  const sizing = sizeMarket(input),
    trends = marketTrends(input);
  return {
    ...input,
    ...sizing,
    ...trends,
    opportunityScore:
      trends.growthScore *
      (1 - trends.competitionScore / 100) *
      input.serviceableFraction *
      input.obtainableFraction,
    forecast: forecastMarket(input, 3),
    method:
      "Growth score × (1 − competition/100) × serviceable fraction × obtainable fraction; 0–100 heuristic, not market certainty.",
  };
}
