import { scanMarket, type MarketInput } from "./scanner";
/** Growth maps -100%..+100% to 0..100. Competition is c/(c+1)*100. */
export function marketTrends(input: MarketInput) {
  const m = scanMarket(input);
  return {
    growthScore: (m.annualGrowth + 1) * 50,
    competitionScore: (m.competitors / (m.competitors + 1)) * 100,
    source: m.source,
    observedAt: m.observedAt,
  };
}
