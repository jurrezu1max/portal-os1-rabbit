import { type Asset } from "./creation";
import { enterFramework } from "./framework";
import { enterPlatform } from "./platform";
import { enterMedia } from "./media";
import { enterProduct } from "./product";
import { enterDistribution } from "./distribution";
import { enterRevenue } from "./revenue";
import { expandAsset } from "./expansion";
export function progressAsset(asset: Asset): Asset {
  switch (asset.stage) {
    case "creation":
      return enterFramework(asset);
    case "framework":
      return enterPlatform(asset);
    case "platform":
      return enterMedia(asset);
    case "media":
      return enterProduct(asset);
    case "product":
      return enterDistribution(asset);
    case "distribution":
      return enterRevenue(asset);
    case "revenue":
      return expandAsset(asset);
    case "expansion":
      throw new Error("Asset is already in expansion.");
  }
}
