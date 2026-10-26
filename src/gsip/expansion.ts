import { advanceAsset, type Asset } from "./creation";
export function expandAsset(asset: Asset): Asset {
  if (asset.revenueState !== "earning")
    throw new Error("Record positive revenue before expansion.");
  return advanceAsset(asset, "expansion");
}
