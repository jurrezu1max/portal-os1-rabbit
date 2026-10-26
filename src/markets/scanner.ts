import {
  finite,
  requireText,
  validateEvidence,
  type Evidence,
} from "../portal/contracts";
export interface MarketInput extends Evidence {
  id: string;
  name: string;
  customers: number;
  annualSpend: number;
  serviceableFraction: number;
  obtainableFraction: number;
  annualGrowth: number;
  competitors: number;
}
export function scanMarket(input: MarketInput): MarketInput {
  requireText(input.id, "Market ID");
  requireText(input.name, "Market name");
  validateEvidence(input);
  finite(input.customers, "Customers");
  finite(input.annualSpend, "Annual spend");
  finite(input.serviceableFraction, "Serviceable fraction", 0, 1);
  finite(input.obtainableFraction, "Obtainable fraction", 0, 1);
  finite(input.annualGrowth, "Annual growth", -1, 1);
  finite(input.competitors, "Competitors");
  if (!Number.isInteger(input.competitors))
    throw new Error("Competitors must be an integer.");
  finite(input.customers * input.annualSpend, "TAM");
  return { ...input };
}
