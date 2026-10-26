import { advanceAsset, type Asset } from "./creation";
export const enterDistribution = (asset: Asset): Asset =>
  advanceAsset(asset, "distribution");
