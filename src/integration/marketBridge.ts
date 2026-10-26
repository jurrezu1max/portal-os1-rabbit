import { evaluateOpportunity } from "../markets/opportunities";
import type { PortalWorkspace } from "../portal/workspace";
import type { GSIPAsset } from "../gsip/registry/types";
import type { Connections } from "./types";
export function connectedOpportunities(workspace: PortalWorkspace) {
  return workspace.markets
    .map(evaluateOpportunity)
    .sort((a, b) => b.opportunityScore - a.opportunityScore);
}
export function marketConnections(
  workspace: PortalWorkspace,
  assets: readonly GSIPAsset[],
  links: Connections["marketInitiatives"],
) {
  return workspace.markets.map((market) => ({
    market,
    assets: assets.filter((asset) => asset.market === market.id),
    initiatives: workspace.initiatives.filter((initiative) =>
      links.some(
        (link) =>
          link.marketId === market.id && link.initiativeId === initiative.id,
      ),
    ),
  }));
}
