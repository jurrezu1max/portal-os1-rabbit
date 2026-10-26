import { finite } from "../portal/contracts";
import { sizeMarket } from "./tam";
import { scanMarket, type MarketInput } from "./scanner";
export function forecastMarket(input: MarketInput, years: number) {
  const m = scanMarket(input);
  finite(years, "Forecast years", 0, 10);
  return {
    value: sizeMarket(m).som * (1 + m.annualGrowth) ** years,
    years,
    source: m.source,
    observedAt: m.observedAt,
    method: "Constant compound growth scenario; not a prediction.",
  };
}
