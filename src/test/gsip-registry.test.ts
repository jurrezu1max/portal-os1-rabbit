import { describe, expect, it, vi } from "vitest";
import {
  createAssetRegistry,
  GSIP_STORAGE_KEY,
  createAsset,
  updateAsset,
  getAsset,
  listAssets,
  createLicense,
  recordRevenue,
  getRevenue,
} from "../gsip/registry/assetRegistry";
import { ASSET_STATUSES, validateAsset } from "../gsip/registry/types";
import { validateLicense } from "../gsip/registry/licenses";
import { requireOwner, validateOwnership } from "../gsip/registry/ownership";
import {
  totalRevenue,
  toCents,
  validateRevenue,
} from "../gsip/registry/revenue";
import { calculateRoyalty } from "../gsip/registry/royalties";
import { identityRegistry } from "../identity/registry";
const date = "2026-10-26T12:00:00.000Z",
  later = "2026-10-26T13:00:00.000Z";
const owner = {
  id: "owner",
  name: "Founder",
  type: "human" as const,
  roles: [],
  capabilities: [],
  createdAt: date,
  updatedAt: date,
};
const input = {
  id: "asset",
  title: "Report",
  description: "Original research report",
  category: "Research",
  ownerId: "owner",
  market: "Education",
};
const findIdentity = (id: string) =>
  ["owner", "next"].includes(id) ? { ...owner, id } : undefined;
function memory(raw: string | null = null) {
  const values = new Map<string, string>();
  if (raw !== null) values.set(GSIP_STORAGE_KEY, raw);
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}
function setup(storage = memory(), now = () => date) {
  let sequence = 0;
  const registry = createAssetRegistry({
    storage,
    now,
    generateId: () => `id-${sequence++}`,
    findIdentity,
  });
  return { registry, storage };
}
function advance(
  registry: ReturnType<typeof createAssetRegistry>,
  id = "asset",
) {
  for (const status of ASSET_STATUSES.slice(1, -1))
    registry.updateAsset(id, { status });
}
function populated() {
  const { registry, storage } = setup();
  registry.createAsset(input);
  registry.createLicense({
    id: "license",
    assetId: "asset",
    holder: "Reader",
    type: "Commercial",
  });
  advance(registry);
  registry.recordRevenue({
    id: "receipt",
    assetId: "asset",
    amount: 0.1,
    source: "Invoice 1",
  });
  return { registry, storage, data: JSON.parse(registry.exportRegistry()) };
}

describe("GS-IP registry public contracts", () => {
  it("creates stable identities, preserves immutable fields, queries and filters assets", () => {
    const { registry } = setup();
    const listener = vi.fn();
    const unsubscribe = registry.subscribe(listener);
    const created = registry.createAsset({ ...input, title: " Report " });
    registry.createAsset({ ...input, id: undefined, title: "Second" });
    expect(created).toEqual({ ...input, status: "Creation", createdAt: date });
    expect(registry.listAssets()).toHaveLength(2);
    expect(registry.listAssets("Creation")).toHaveLength(2);
    expect(registry.listAssets("Product")).toEqual([]);
    expect(registry.getAsset("missing")).toBeUndefined();
    registry.updateAsset("asset", {
      title: "Updated",
      id: "injected",
      createdAt: later,
    } as Parameters<typeof registry.updateAsset>[1]);
    expect(registry.getAsset("asset")).toMatchObject({
      id: "asset",
      title: "Updated",
      createdAt: date,
    });
    expect(listener).toHaveBeenCalledTimes(3);
    unsubscribe();
    registry.updateAsset("asset", {
      description: "New description",
      category: "Media",
      market: "Publishing",
    });
    expect(listener).toHaveBeenCalledTimes(3);
    expect(() => registry.updateAsset("missing", {})).toThrow("not found");
    expect(() => registry.createAsset(input)).toThrow("Duplicate");
  });

  it("honors every lifecycle transition and requires receipts before Expansion", () => {
    const { registry } = setup();
    registry.createAsset(input);
    expect(() => registry.updateAsset("asset", { status: "Product" })).toThrow(
      "one stage",
    );
    expect(() => registry.updateAsset("asset", { status: "invalid" })).toThrow(
      "Unknown asset status",
    );
    expect(() =>
      registry.recordRevenue({ assetId: "asset", amount: 10, source: "Early" }),
    ).toThrow("Advance");
    advance(registry);
    expect(() => registry.updateAsset("asset", { status: "Creation" })).toThrow(
      "one stage",
    );
    expect(() =>
      registry.updateAsset("asset", { status: "Expansion" }),
    ).toThrow("positive revenue");
    registry.recordRevenue({
      assetId: "asset",
      amount: 0.1,
      source: "Invoice 1",
    });
    registry.recordRevenue({
      assetId: "asset",
      amount: 0.2,
      source: "Invoice 2",
    });
    registry.updateAsset("asset", { status: "Expansion" });
    registry.recordRevenue({
      assetId: "asset",
      amount: 0.01,
      source: "Invoice 3",
    });
    expect(registry.getMetrics().revenueGenerated).toBe(0.31);
    expect(
      registry
        .getMetrics()
        .assetsByStage.find((stage) => stage.status === "Expansion")!.count,
    ).toBe(1);
    expect(registry.getRevenue("asset")).toHaveLength(3);
    expect(registry.getRevenue("missing")).toEqual([]);
    expect(registry.getRevenue()).toHaveLength(3);
  });

  it("links owners to identity records, records transfers, and retains missing historical owners", () => {
    const storage = memory();
    const now = vi.fn().mockReturnValue(date);
    let lookup = findIdentity;
    const registry = createAssetRegistry({
      storage,
      now,
      findIdentity: (id) => lookup(id),
    });
    expect(() =>
      registry.createAsset({ ...input, ownerId: "unknown" }),
    ).toThrow("Identity Registry");
    registry.createAsset(input);
    now.mockReturnValue(later);
    registry.updateAsset("asset", { ownerId: "next" });
    expect(registry.getSnapshot().ownership).toMatchObject([
      { fromOwnerId: null, toOwnerId: "owner", timestamp: date },
      { fromOwnerId: "owner", toOwnerId: "next", timestamp: later },
    ]);
    const before = registry.getSnapshot();
    expect(() =>
      registry.updateAsset("asset", { ownerId: "unknown" }),
    ).toThrow();
    expect(registry.getSnapshot()).toBe(before);
    lookup = () => undefined;
    registry.updateAsset("asset", { title: "Preserved historical owner" });
    const restored = createAssetRegistry({ storage, findIdentity: lookup });
    expect(restored.getAsset("asset")!.ownerId).toBe("next");
    expect(restored.getSnapshot().error).toBe("");
    expect(requireOwner(" owner ", findIdentity)).toBe("owner");
  });

  it("records independent licenses and receipts and calculates complete metrics", () => {
    const { registry } = populated();
    registry.createAsset({ ...input, id: "second" });
    registry.createLicense({
      assetId: "second",
      holder: "Team",
      type: "Internal",
    });
    expect(registry.getMetrics()).toMatchObject({
      assetsCreated: 2,
      activeLicenses: 2,
      revenueGenerated: 0.1,
    });
    expect(
      registry
        .getMetrics()
        .assetsByStage.reduce((sum, stage) => sum + stage.count, 0),
    ).toBe(2);
    expect(() =>
      registry.createLicense({
        assetId: "missing",
        holder: "Team",
        type: "Internal",
      }),
    ).toThrow("not found");
    expect(() =>
      registry.recordRevenue({
        assetId: "missing",
        amount: 1,
        source: "Invoice",
      }),
    ).toThrow("not found");
    expect(() =>
      registry.createLicense({
        id: "license",
        assetId: "asset",
        holder: "Duplicate",
        type: "Copy",
      }),
    ).toThrow("Duplicate");
    expect(() =>
      registry.recordRevenue({
        id: "receipt",
        assetId: "asset",
        amount: 1,
        source: "Duplicate",
      }),
    ).toThrow("Duplicate");
    const snapshot = registry.getSnapshot();
    expect(() =>
      registry.recordRevenue({ assetId: "asset", amount: -1, source: "Bad" }),
    ).toThrow();
    expect(registry.getSnapshot()).toBe(snapshot);
  });

  it("persists all collections across reloads and isolates existing storage", () => {
    const { registry, storage } = populated();
    storage.setItem("portal-os-alpha-v1", "portal");
    storage.setItem("portal-os-identities-v1", "identities");
    storage.setItem("max-sim-workbench-v2", "kernel");
    registry.updateAsset("asset", { ownerId: "next" });
    const restored = createAssetRegistry({ storage, findIdentity });
    expect(restored.getSnapshot()).toEqual(registry.getSnapshot());
    expect(restored.exportRegistry()).toBe(registry.exportRegistry());
    expect(storage.getItem("portal-os-alpha-v1")).toBe("portal");
    expect(storage.getItem("portal-os-identities-v1")).toBe("identities");
    expect(storage.getItem("max-sim-workbench-v2")).toBe("kernel");
  });

  it("protects all input, query and snapshot references against external mutation", () => {
    const { registry } = populated();
    const asset = registry.getAsset("asset")!;
    asset.title = "Changed";
    registry.listAssets()[0].ownerId = "unknown";
    registry.getRevenue()[0].amount = 100;
    const returned = registry.createLicense({
      assetId: "asset",
      holder: "Reader 2",
      type: "Personal",
    });
    returned.holder = "Changed";
    const receipt = registry.recordRevenue({
      assetId: "asset",
      amount: 1,
      source: "Invoice",
    });
    receipt.amount = 99;
    expect(registry.getAsset("asset")!.title).toBe("Report");
    expect(registry.getRevenue().map((receipt) => receipt.amount)).toEqual([
      0.1, 1,
    ]);
    expect(registry.getSnapshot().licenses[1].holder).toBe("Reader 2");
    expect(() => {
      registry.getSnapshot().assets[0].title = "Changed";
    }).toThrow();
    expect(() => {
      registry.getSnapshot().licenses.push(returned);
    }).toThrow();
  });

  it("commits nothing on quota failures and retries without duplicate receipts", () => {
    const { registry, storage } = populated();
    const before = registry.getSnapshot(),
      raw = storage.getItem(GSIP_STORAGE_KEY);
    const spy = vi.spyOn(storage, "setItem").mockImplementation(() => {
      throw new Error("Quota");
    });
    expect(() =>
      registry.recordRevenue({
        id: "retry",
        assetId: "asset",
        amount: 1,
        source: "Invoice",
      }),
    ).toThrow("Unable to save");
    expect(registry.getSnapshot()).toBe(before);
    expect(storage.getItem(GSIP_STORAGE_KEY)).toBe(raw);
    spy.mockRestore();
    registry.recordRevenue({
      id: "retry",
      assetId: "asset",
      amount: 1,
      source: "Invoice",
    });
    expect(registry.getRevenue()).toHaveLength(2);
  });

  it("preserves corrupt data and recovers only after explicit replacement", () => {
    const storage = memory("{broken");
    const registry = createAssetRegistry({ storage, findIdentity });
    expect(registry.getSnapshot().recovery).toBe("{broken");
    expect(() => registry.createAsset(input)).toThrow("paused");
    expect(storage.getItem(GSIP_STORAGE_KEY)).toBe("{broken");
    registry.replaceSaved();
    expect(registry.getSnapshot().error).toBe("");
    expect(registry.getSnapshot().recovery).toBeNull();
    registry.createAsset(input);
    expect(registry.listAssets()).toHaveLength(1);
    const unavailable = createAssetRegistry({
      storage: {
        getItem: () => {
          throw new Error("Denied");
        },
        setItem: () => {},
      },
    });
    expect(unavailable.getSnapshot().recovery).toBeNull();
    expect(unavailable.getSnapshot().error).toContain("paused");
    unavailable.replaceSaved();
    expect(unavailable.getSnapshot().error).toBe("");
  });

  it("rejects malformed persisted shapes, references, chronology and ownership chains", () => {
    const { data } = populated();
    const invalid = [
      null,
      [],
      false,
      "bad",
      {},
      { ...data, version: 2 },
      { ...data, assets: null },
      { ...data, licenses: {} },
      { ...data, assets: Array(2001).fill(data.assets[0]) },
      { ...data, assets: [data.assets[0], data.assets[0]] },
      { ...data, licenses: [{ ...data.licenses[0], assetId: "missing" }] },
      { ...data, revenue: [{ ...data.revenue[0], assetId: "missing" }] },
      {
        ...data,
        licenses: [
          { ...data.licenses[0], issuedAt: "2026-10-25T12:00:00.000Z" },
        ],
      },
      { ...data, assets: [{ ...data.assets[0], status: "Media" }] },
      {
        ...data,
        assets: [{ ...data.assets[0], status: "Expansion" }],
        revenue: [],
      },
      { ...data, ownership: [] },
      { ...data, ownership: [{ ...data.ownership[0], fromOwnerId: "other" }] },
      { ...data, ownership: [{ ...data.ownership[0], timestamp: later }] },
      { ...data, assets: [{ ...data.assets[0], ownerId: "next" }] },
      {
        ...data,
        ownership: [
          ...data.ownership,
          {
            ...data.ownership[0],
            id: "transfer",
            fromOwnerId: "wrong",
            toOwnerId: "owner",
            timestamp: later,
          },
        ],
      },
      {
        ...data,
        ownership: [
          ...data.ownership,
          {
            ...data.ownership[0],
            id: "transfer",
            fromOwnerId: "owner",
            toOwnerId: "owner",
            timestamp: later,
          },
          {
            ...data.ownership[0],
            id: "transfer2",
            fromOwnerId: "owner",
            toOwnerId: "owner",
            timestamp: date,
          },
        ],
      },
    ];
    for (const value of invalid) {
      const raw = JSON.stringify(value);
      const registry = createAssetRegistry({ storage: memory(raw) });
      expect(registry.getSnapshot().error, raw).toContain("paused");
      expect(registry.getSnapshot().recovery).toBe(raw);
    }
  });

  it("validates asset, license and ownership schemas at runtime", () => {
    const asset = { ...input, status: "Creation", createdAt: date };
    for (const value of [
      null,
      [],
      7,
      { ...asset, id: 3 },
      { ...asset, title: " " },
      { ...asset, category: "x".repeat(201) },
      { ...asset, description: "x".repeat(20001) },
      { ...asset, status: "wrong" },
      { ...asset, createdAt: "bad" },
      { ...asset, createdAt: "2026-10-26" },
    ])
      expect(() => validateAsset(value)).toThrow();
    expect(validateAsset(asset)).toEqual(asset);
    expect(() =>
      validateLicense({
        id: "id",
        assetId: "asset",
        holder: "",
        type: "Commercial",
        issuedAt: date,
      }),
    ).toThrow();
    expect(
      validateOwnership({
        id: "id",
        assetId: "asset",
        fromOwnerId: "owner",
        toOwnerId: "next",
        timestamp: date,
      }).fromOwnerId,
    ).toBe("owner");
  });

  it("uses exact cents, rejects invalid receipts/overflow, and rounds royalty previews", () => {
    for (const amount of [-1, NaN, Infinity, 1.001, 1_000_000_000.01])
      expect(() => toCents(amount)).toThrow();
    expect(toCents(0)).toBe(0);
    expect(toCents(0.29)).toBe(29);
    for (const amount of ["10", 0, -1, NaN])
      expect(() =>
        validateRevenue({
          id: "id",
          assetId: "asset",
          source: "Invoice",
          timestamp: date,
          amount,
        }),
      ).toThrow();
    const record = {
      id: "id",
      assetId: "asset",
      source: "Invoice",
      timestamp: date,
      amount: 1_000_000_000,
    };
    expect(() => totalRevenue([record, { ...record, amount: 0.01 }])).toThrow();
    expect(
      totalRevenue([
        { ...record, amount: 0.1 },
        { ...record, amount: 0.2 },
      ]),
    ).toBe(0.3);
    expect(calculateRoyalty(0, 0)).toBe(0);
    expect(calculateRoyalty(100, 100)).toBe(100);
    expect(calculateRoyalty(10.05, 10)).toBe(1.01);
    for (const rate of [-1, 101, NaN, Infinity])
      expect(() => calculateRoyalty(10, rate)).toThrow("0–100");
  });

  it("exposes the browser-independent singleton API and default owner lookup", () => {
    const owner = identityRegistry.registerIdentity({
      type: "organization",
      name: "Registry API test",
    });
    const asset = createAsset({ ...input, id: undefined, ownerId: owner.id });
    updateAsset(asset.id, { title: "API" });
    expect(getAsset(asset.id)!.title).toBe("API");
    expect(listAssets().some((item) => item.id === asset.id)).toBe(true);
    createLicense({ assetId: asset.id, holder: "Reader", type: "Personal" });
    for (const status of ASSET_STATUSES.slice(1, -1))
      updateAsset(asset.id, { status });
    recordRevenue({ assetId: asset.id, amount: 1, source: "API" });
    expect(getRevenue(asset.id)[0].amount).toBe(1);
    identityRegistry.removeIdentity(owner.id);
  });
});
