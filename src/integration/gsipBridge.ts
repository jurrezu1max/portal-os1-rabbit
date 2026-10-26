import type { AssetRegistry } from "../gsip/registry/assetRegistry";
import { ASSET_STATUSES, type AssetStatus } from "../gsip/registry/types";
import { STAGES } from "../gsip/creation";
import type { Identity } from "../identity/types";
import type { PortalWorkspace } from "../portal/workspace";
import type { Connections } from "./types";
/** Assign a stable market ID; existing free-text values remain visible until linked. */
export function connectAssetMarket(
  registry: AssetRegistry,
  workspace: PortalWorkspace,
  assetId: string,
  marketId: string,
) {
  if (!workspace.markets.some((market) => market.id === marketId))
    throw new Error("Market not found.");
  return registry.updateAsset(assetId, { market: marketId });
}
/** Read-only projection lets the existing compliance editor operate on registry assets. */
export function registryComplianceWorkspace(
  workspace: PortalWorkspace,
  registry: AssetRegistry,
  identities: readonly Identity[],
  connections: Connections,
): PortalWorkspace {
  return {
    ...workspace,
    assets: registry.listAssets().map((asset) => {
      const index = ASSET_STATUSES.indexOf(asset.status as AssetStatus);
      return {
        id: asset.id,
        title: asset.title,
        owner:
          identities.find((identity) => identity.id === asset.ownerId)?.name ??
          asset.ownerId,
        category: asset.category,
        marketId: asset.market,
        status: "active",
        stage: STAGES[index],
        history: STAGES.slice(0, index + 1),
        annualRevenue: 0,
        revenueState: index >= 6 ? "eligible" : "none",
      };
    }),
    compliance: structuredClone(connections.compliance),
    auditHistory: structuredClone(connections.auditHistory),
  };
}
