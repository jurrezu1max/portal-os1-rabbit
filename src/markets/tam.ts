import { scanMarket, type MarketInput } from "./scanner";
export function sizeMarket(input: MarketInput) {
  const market = scanMarket(input);
  const tam = market.customers * market.annualSpend;
  const sam = tam * market.serviceableFraction;
  return {
    tam,
    sam,
    som: sam * market.obtainableFraction,
    currency: "USD/year",
    source: market.source,
    observedAt: market.observedAt,
  };
}
