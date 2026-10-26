import { createId } from "../../engine/id";
import { identityRegistry } from "../../identity/registry";
import type { Identity } from "../../identity/types";
import { validateLicense } from "./licenses";
import { requireOwner, validateOwnership } from "./ownership";
import { totalRevenue, validateRevenue } from "./revenue";
import {
  ASSET_STATUSES,
  object,
  validateAsset,
  type GSIPAsset,
  type License,
  type RevenueRecord,
  type OwnershipRecord,
  type AssetInput,
  type AssetUpdate,
  type LicenseInput,
  type RevenueInput,
  type AssetStatus,
} from "./types";

export const GSIP_STORAGE_KEY = "portal-os-gsip-registry-v1";
interface RegistryData {
  version: 1;
  assets: GSIPAsset[];
  licenses: License[];
  revenue: RevenueRecord[];
  ownership: OwnershipRecord[];
}
interface Snapshot extends RegistryData {
  error: string;
  recovery: string | null;
}
function validateData(value: unknown): RegistryData {
  const row = object(value);
  if (row.version !== 1) throw new Error("Unknown GS-IP registry version.");
  function collection<T extends { id: string }>(
    value: unknown,
    read: (row: unknown) => T,
  ): T[] {
    if (!Array.isArray(value) || value.length > 2000)
      throw new Error("Registry collections are limited to 2,000 records.");
    const result = value.map(read);
    if (new Set(result.map((item) => item.id)).size !== result.length)
      throw new Error("Duplicate registry IDs are not allowed.");
    return result;
  }
  const assets = collection(row.assets, validateAsset);
  const licenses = collection(row.licenses, validateLicense);
  const revenue = collection(row.revenue, validateRevenue);
  const ownership = collection(row.ownership, validateOwnership);
  const references = [
    ...licenses.map((record) => ({
      assetId: record.assetId,
      timestamp: record.issuedAt,
    })),
    ...revenue,
    ...ownership,
  ];
  for (const record of references) {
    const asset = assets.find((asset) => asset.id === record.assetId);
    if (!asset) throw new Error("Registry record references an unknown asset.");
    if (record.timestamp < asset.createdAt)
      throw new Error("Registry record cannot precede asset creation.");
  }
  totalRevenue(revenue);
  for (const asset of assets) {
    const receipts = revenue.filter((record) => record.assetId === asset.id);
    if (receipts.length && !["Revenue", "Expansion"].includes(asset.status))
      throw new Error(
        "Revenue records require a distributed asset in Revenue or Expansion.",
      );
    if (asset.status === "Expansion" && totalRevenue(receipts) <= 0)
      throw new Error("Record positive revenue before Expansion.");
    const history = ownership.filter((record) => record.assetId === asset.id);
    if (
      !history.length ||
      history[0].fromOwnerId !== null ||
      history[0].timestamp !== asset.createdAt
    )
      throw new Error("Asset requires its original ownership record.");
    for (let index = 1; index < history.length; index++) {
      if (
        history[index].fromOwnerId !== history[index - 1].toOwnerId ||
        history[index].timestamp < history[index - 1].timestamp
      )
        throw new Error("Invalid ownership history.");
    }
    if (history[history.length - 1].toOwnerId !== asset.ownerId)
      throw new Error("Current owner must agree with ownership history.");
  }
  return { version: 1, assets, licenses, revenue, ownership };
}
function freeze(snapshot: Snapshot): Snapshot {
  for (const collection of [
    snapshot.assets,
    snapshot.licenses,
    snapshot.revenue,
    snapshot.ownership,
  ]) {
    collection.forEach(Object.freeze);
    Object.freeze(collection);
  }
  return Object.freeze(snapshot);
}
export function createAssetRegistry({
  storage = null,
  now = () => new Date().toISOString(),
  generateId = createId,
  findIdentity = identityRegistry.findIdentity,
}: {
  storage?: Pick<Storage, "getItem" | "setItem"> | null;
  now?: () => string;
  generateId?: () => string;
  findIdentity?: (id: string) => Identity | undefined;
} = {}) {
  let snapshot: Snapshot = {
    version: 1,
    assets: [],
    licenses: [],
    revenue: [],
    ownership: [],
    error: "",
    recovery: null,
  };
  let raw: string | null = null;
  try {
    raw = storage?.getItem(GSIP_STORAGE_KEY) ?? null;
    if (raw !== null)
      snapshot = { ...snapshot, ...validateData(JSON.parse(raw)) };
  } catch {
    snapshot = {
      ...snapshot,
      error:
        "Saved GS-IP records could not be loaded. Writes are paused; export the original before replacing it.",
      recovery: raw,
    };
  }
  snapshot = freeze(snapshot);
  const listeners = new Set<() => void>();
  function commit(data: RegistryData, replace = false) {
    if (snapshot.error && !replace) throw new Error(snapshot.error);
    const checked = validateData(data);
    try {
      storage?.setItem(GSIP_STORAGE_KEY, JSON.stringify(checked));
    } catch {
      throw new Error(
        "Unable to save GS-IP records. Browser storage is unavailable or full; export and retry.",
      );
    }
    snapshot = freeze({ ...checked, error: "", recovery: null });
    listeners.forEach((listener) => listener());
  }
  function required(id: string): GSIPAsset {
    const asset = snapshot.assets.find((asset) => asset.id === id);
    if (!asset) throw new Error(`Asset not found: ${id}.`);
    return asset;
  }
  const api = {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    createAsset(input: AssetInput): GSIPAsset {
      const asset = validateAsset({
        ...input,
        id: input.id ?? generateId(),
        status: "Creation",
        createdAt: now(),
        ownerId: requireOwner(input.ownerId, findIdentity),
      });
      const ownership = validateOwnership({
        id: generateId(),
        assetId: asset.id,
        fromOwnerId: null,
        toOwnerId: asset.ownerId,
        timestamp: asset.createdAt,
      });
      commit({
        ...snapshot,
        assets: [...snapshot.assets, asset],
        ownership: [...snapshot.ownership, ownership],
      });
      return structuredClone(asset);
    },
    updateAsset(id: string, changes: AssetUpdate): GSIPAsset {
      const previous = required(id);
      const asset = validateAsset({
        ...previous,
        ...changes,
        id: previous.id,
        createdAt: previous.createdAt,
      });
      const oldStage = ASSET_STATUSES.indexOf(previous.status as AssetStatus);
      const newStage = ASSET_STATUSES.indexOf(asset.status as AssetStatus);
      if (newStage !== oldStage && newStage !== oldStage + 1)
        throw new Error("Assets must advance one stage at a time.");
      let ownership = snapshot.ownership;
      if (asset.ownerId !== previous.ownerId) {
        requireOwner(asset.ownerId, findIdentity);
        ownership = [
          ...ownership,
          validateOwnership({
            id: generateId(),
            assetId: id,
            fromOwnerId: previous.ownerId,
            toOwnerId: asset.ownerId,
            timestamp: now(),
          }),
        ];
      }
      commit({
        ...snapshot,
        assets: snapshot.assets.map((item) => (item.id === id ? asset : item)),
        ownership,
      });
      return structuredClone(asset);
    },
    getAsset(id: string): GSIPAsset | undefined {
      const asset = snapshot.assets.find((item) => item.id === id);
      return asset && structuredClone(asset);
    },
    listAssets(status?: AssetStatus): GSIPAsset[] {
      return structuredClone(
        snapshot.assets.filter(
          (asset) => status === undefined || asset.status === status,
        ),
      );
    },
    createLicense(input: LicenseInput): License {
      required(input.assetId);
      const license = validateLicense({
        ...input,
        id: input.id ?? generateId(),
        issuedAt: now(),
      });
      commit({ ...snapshot, licenses: [...snapshot.licenses, license] });
      return structuredClone(license);
    },
    recordRevenue(input: RevenueInput): RevenueRecord {
      const asset = required(input.assetId);
      if (!["Revenue", "Expansion"].includes(asset.status))
        throw new Error(
          "Advance the asset to Revenue before recording receipts.",
        );
      const record = validateRevenue({
        ...input,
        id: input.id ?? generateId(),
        timestamp: now(),
      });
      commit({ ...snapshot, revenue: [...snapshot.revenue, record] });
      return structuredClone(record);
    },
    getRevenue(assetId?: string): RevenueRecord[] {
      return structuredClone(
        snapshot.revenue.filter(
          (record) => assetId === undefined || record.assetId === assetId,
        ),
      );
    },
    getMetrics() {
      return {
        assetsCreated: snapshot.assets.length,
        activeLicenses: snapshot.licenses.length,
        revenueGenerated: totalRevenue(snapshot.revenue),
        assetsByStage: ASSET_STATUSES.map((status) => ({
          status,
          count: snapshot.assets.filter((asset) => asset.status === status)
            .length,
        })),
      };
    },
    exportRegistry: () =>
      JSON.stringify(
        {
          version: 1,
          assets: snapshot.assets,
          licenses: snapshot.licenses,
          revenue: snapshot.revenue,
          ownership: snapshot.ownership,
        },
        null,
        2,
      ),
    replaceSaved: () => commit(snapshot, true),
  };
  return api;
}
export type AssetRegistry = ReturnType<typeof createAssetRegistry>;
export const assetRegistry = createAssetRegistry({
  storage:
    typeof window === "undefined"
      ? null
      : {
          getItem: (key) => window.localStorage.getItem(key),
          setItem: (key, value) => window.localStorage.setItem(key, value),
        },
});
export const {
  createAsset,
  updateAsset,
  getAsset,
  listAssets,
  createLicense,
  recordRevenue,
  getRevenue,
} = assetRegistry;
