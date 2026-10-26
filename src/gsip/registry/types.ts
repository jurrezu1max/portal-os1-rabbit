export interface GSIPAsset {
  id: string;
  title: string;
  description: string;
  category: string;
  ownerId: string;
  status: string;
  market: string;
  createdAt: string;
}
export interface License {
  id: string;
  assetId: string;
  holder: string;
  type: string;
  issuedAt: string;
}
export interface RevenueRecord {
  id: string;
  assetId: string;
  amount: number;
  source: string;
  timestamp: string;
}
export interface OwnershipRecord {
  id: string;
  assetId: string;
  fromOwnerId: string | null;
  toOwnerId: string;
  timestamp: string;
}
export const ASSET_STATUSES = [
  "Creation",
  "Framework",
  "Platform",
  "Media",
  "Product",
  "Distribution",
  "Revenue",
  "Expansion",
] as const;
export type AssetStatus = (typeof ASSET_STATUSES)[number];
export type AssetInput = Omit<GSIPAsset, "id" | "status" | "createdAt"> & {
  id?: string;
};
export type AssetUpdate = Partial<Omit<GSIPAsset, "id" | "createdAt">>;
export type LicenseInput = Omit<License, "id" | "issuedAt"> & { id?: string };
export type RevenueInput = Omit<RevenueRecord, "id" | "timestamp"> & {
  id?: string;
};

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Expected a GS-IP record.");
  return value as Record<string, unknown>;
}
export function text(value: unknown, max = 200): string {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw new Error(`Text requires 1–${max} characters.`);
  return value.trim();
}
export function timestamp(value: unknown): string {
  const date = text(value);
  if (
    !Number.isFinite(Date.parse(date)) ||
    new Date(date).toISOString() !== date
  )
    throw new Error("Expected a canonical ISO timestamp.");
  return date;
}
export function validateAsset(value: unknown): GSIPAsset {
  const row = object(value);
  if (!ASSET_STATUSES.includes(row.status as AssetStatus))
    throw new Error("Unknown asset status.");
  return {
    id: text(row.id),
    title: text(row.title),
    description: text(row.description, 20000),
    category: text(row.category),
    ownerId: text(row.ownerId),
    status: row.status as AssetStatus,
    market: text(row.market),
    createdAt: timestamp(row.createdAt),
  };
}
