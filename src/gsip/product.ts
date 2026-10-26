import { advanceAsset, type Asset } from "./creation";
export const enterProduct = (asset: Asset): Asset =>
  advanceAsset(asset, "product");
