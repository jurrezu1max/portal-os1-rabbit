import { evaluateOpportunity } from "../markets/opportunities";
import { auditCompliance } from "../compliance/audit";
import { prioritize } from "../mission/planning";
import { planetaryIndicators } from "../umbrella/dashboard";
import type { PortalWorkspace } from "./workspace";
export function composeDashboard(workspace: PortalWorkspace) {
  return {
    opportunities: workspace.markets
      .map(evaluateOpportunity)
      .sort((a, b) => b.opportunityScore - a.opportunityScore),
    decisions: workspace.compliance.flatMap(auditCompliance),
    missions: prioritize(workspace.missions),
    indicators: planetaryIndicators(workspace.observations),
    assets: {
      total: workspace.assets.length,
      earning: workspace.assets.filter(
        (asset) => asset.revenueState === "earning",
      ).length,
      annualRevenue: workspace.assets.reduce(
        (sum, asset) => sum + asset.annualRevenue,
        0,
      ),
    },
    readiness: workspace.initiatives.length
      ? workspace.initiatives.reduce(
          (sum, item) => sum + item.readinessScore,
          0,
        ) / workspace.initiatives.length
      : null,
  };
}
