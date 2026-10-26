import { advanceAsset, type Asset } from "./creation";
export const enterPlatform = (asset: Asset): Asset =>
  advanceAsset(asset, "platform");
