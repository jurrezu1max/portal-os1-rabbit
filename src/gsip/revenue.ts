import { finite } from "../portal/contracts";
import { advanceAsset, type Asset } from "./creation";
export function enterRevenue(asset: Asset): Asset {
  return { ...advanceAsset(asset, "revenue"), revenueState: "eligible" };
}
export function recordRevenue(asset: Asset, annualRevenue: number): Asset {
  finite(annualRevenue, "Annual revenue");
  if (asset.stage !== "revenue" && asset.stage !== "expansion")
    throw new Error("Distribute the asset before recording revenue.");
  return {
    ...asset,
    annualRevenue,
    revenueState: annualRevenue > 0 ? "earning" : "eligible",
  };
}
