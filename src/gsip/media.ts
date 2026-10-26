import { advanceAsset, type Asset } from "./creation";
export const enterMedia = (asset: Asset): Asset => advanceAsset(asset, "media");
