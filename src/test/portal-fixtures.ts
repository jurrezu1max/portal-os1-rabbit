import type { MarketInput } from "../markets/scanner";
import type { ComplianceRecord } from "../compliance/contracts";
import type { Observation } from "../portal/contracts";
import { newWorkspace } from "../portal/workspace";
import { createAsset } from "../gsip/creation";
export const evidence = {
  source: "Synthetic study A",
  observedAt: "2026-10-26T10:00:00.000Z",
};
export const observation: Observation = {
  ...evidence,
  id: "obs-1",
  domain: "climate",
  metric: "emissions",
  unit: "tCO2e/year",
  value: 10,
};
export const market: MarketInput = {
  ...evidence,
  id: "market-1",
  name: "Synthetic market",
  customers: 1000,
  annualSpend: 100,
  serviceableFraction: 0.5,
  obtainableFraction: 0.1,
  annualGrowth: 0.2,
  competitors: 3,
};
export const compliance: ComplianceRecord = {
  ...evidence,
  id: "check-1",
  assetId: "asset-1",
  owner: "Founder",
  copyright: "Original work",
  trademark: "Not applicable: no mark used",
  license: "CC-BY-4.0",
  personalData: false,
  lawfulBasis: "",
  retentionDays: null,
  reviewer: "Reviewer",
  approved: true,
  likelihood: 1,
  impact: 2,
};
export function populatedWorkspace() {
  return {
    ...newWorkspace(),
    goals: ["research climate"],
    observations: [observation],
    markets: [market],
    assets: [
      createAsset(
        "asset-1",
        "Synthetic report",
        "Founder",
        "Research",
        market.id,
      ),
    ],
    compliance: [compliance],
  };
}
