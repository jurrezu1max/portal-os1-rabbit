import { advanceAsset, type Asset } from "./creation";
export const enterFramework = (asset: Asset): Asset =>
  advanceAsset(asset, "framework");
