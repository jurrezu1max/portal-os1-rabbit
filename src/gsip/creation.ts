import { requireText } from "../portal/contracts";
export const STAGES = [
  "creation",
  "framework",
  "platform",
  "media",
  "product",
  "distribution",
  "revenue",
  "expansion",
] as const;
export type AssetStage = (typeof STAGES)[number];
export interface Asset {
  id: string;
  title: string;
  status: "active" | "paused";
  owner: string;
  category: string;
  revenueState: "none" | "eligible" | "earning";
  marketId: string;
  stage: AssetStage;
  history: AssetStage[];
  annualRevenue: number;
}
export function createAsset(
  id: string,
  title: string,
  owner: string,
  category: string,
  marketId: string,
): Asset {
  return {
    id: requireText(id, "Asset ID"),
    title: requireText(title, "Asset title"),
    owner: requireText(owner, "Owner"),
    category: requireText(category, "Category"),
    marketId: requireText(marketId, "Market assignment"),
    status: "active",
    revenueState: "none",
    stage: "creation",
    history: ["creation"],
    annualRevenue: 0,
  };
}
export function advanceAsset(asset: Asset, stage: AssetStage): Asset {
  if (
    asset.status !== "active" ||
    STAGES.indexOf(stage) !== STAGES.indexOf(asset.stage) + 1
  )
    throw new Error("Assets must advance one stage at a time while active.");
  return { ...asset, stage, history: [...asset.history, stage] };
}
