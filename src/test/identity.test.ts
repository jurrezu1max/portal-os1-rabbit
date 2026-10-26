import { describe, expect, it, vi } from "vitest";
import {
  createIdentityRegistry,
  IDENTITY_STORAGE_KEY,
  identityRegistry,
  registerIdentity,
  updateIdentity,
  findIdentity,
  listIdentities,
  removeIdentity,
} from "../identity/registry";
import { validateIdentity, type Identity } from "../identity/types";
import { validateCapability } from "../identity/capabilities";
import { ROLES } from "../identity/roles";
import { capabilityVector } from "../identity/vectors";

const date = "2026-10-26T10:00:00.000Z";
const later = "2026-10-26T11:00:00.000Z";
const fixture: Identity = {
  id: "human-1",
  type: "human",
  name: "Founder",
  roles: ["Founder"],
  capabilities: [],
  createdAt: date,
  updatedAt: date,
};
const capability = {
  id: "research",
  name: "Research",
  category: "ICV",
  proficiency: 75,
};
function memory(raw: string | null = null) {
  const values = new Map<string, string>();
  if (raw !== null) values.set(IDENTITY_STORAGE_KEY, raw);
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}
function data(identities: unknown = [], capabilities: unknown = []) {
  return { version: 1, identities, capabilities };
}

describe("Identity registry public contract", () => {
  it("creates all identity types, updates only mutable fields, queries, and removes", () => {
    const storage = memory();
    const now = vi.fn().mockReturnValue(date);
    const registry = createIdentityRegistry({
      storage,
      now,
      generateId: () => "generated",
    });
    const listener = vi.fn();
    const unsubscribe = registry.subscribe(listener);
    const human = registry.registerIdentity({
      name: " Alice ",
      type: "human",
      roles: ["Founder"],
    });
    expect(human).toEqual({ ...fixture, id: "generated", name: "Alice" });
    registry.registerIdentity({ id: "agent", name: "Market", type: "agent" });
    registry.registerIdentity({
      id: "org",
      name: "Umbrella",
      type: "organization",
    });
    expect(registry.listIdentities()).toHaveLength(3);
    expect(
      registry.listIdentities("agent").map((identity) => identity.id),
    ).toEqual(["agent"]);
    expect(registry.listIdentities("organization")).toHaveLength(1);
    now.mockReturnValue(later);
    const update = registry.updateIdentity(human.id, {
      name: "Alice Jones",
      id: "injected",
      createdAt: later,
    } as Parameters<typeof registry.updateIdentity>[1]);
    expect(update).toMatchObject({
      id: human.id,
      createdAt: date,
      updatedAt: later,
      name: "Alice Jones",
    });
    expect(registry.findIdentity("missing")).toBeUndefined();
    expect(registry.removeIdentity("missing")).toBe(false);
    expect(registry.removeIdentity("agent")).toBe(true);
    expect(registry.findIdentity("agent")).toBeUndefined();
    expect(listener).toHaveBeenCalledTimes(5);
    unsubscribe();
    registry.removeIdentity("org");
    expect(listener).toHaveBeenCalledTimes(5);
    expect(() => registry.updateIdentity("missing", {})).toThrow("not found");
    expect(storage.values.has(IDENTITY_STORAGE_KEY)).toBe(true);
  });

  it("assigns/revokes every role and capability idempotently, rejecting unknown and duplicate references atomically", () => {
    const registry = createIdentityRegistry({ now: () => date });
    registry.registerIdentity({ id: "person", name: "Person", type: "human" });
    registry.registerIdentity({ id: "other", name: "Other", type: "human" });
    registry.saveCapability(capability);
    registry.saveCapability({ ...capability, proficiency: 100 });
    registry.saveCapability({ ...capability, id: "other", proficiency: 0 });
    for (const role of ROLES) registry.assignRole("person", role);
    registry.assignRole("person", "Founder");
    expect(registry.findIdentity("person")!.roles).toEqual(ROLES);
    for (const role of ROLES) registry.revokeRole("person", role);
    registry.assignCapability("person", capability.id);
    registry.assignCapability("person", capability.id);
    registry.assignCapability("person", "other");
    expect(registry.findIdentity("person")!.capabilities).toEqual([
      "research",
      "other",
    ]);
    registry.revokeCapability("person", "other");
    expect(() => registry.assignRole("person", "Root")).toThrow("Unknown role");
    expect(() => registry.assignCapability("person", "missing")).toThrow(
      "unknown capability",
    );
    expect(() =>
      registry.registerIdentity({
        id: "person",
        name: "Duplicate",
        type: "agent",
      }),
    ).toThrow("Duplicate");
    expect(() =>
      registry.updateIdentity("person", {
        capabilities: ["research", "research"],
      }),
    ).toThrow("Duplicate");
    expect(registry.removeCapability("missing")).toBe(false);
    expect(registry.removeCapability("research")).toBe(true);
    expect(registry.findIdentity("person")!.capabilities).toEqual([]);
    expect(registry.getSnapshot().capabilities.map((item) => item.id)).toEqual([
      "other",
    ]);
  });

  it("round trips creates, updates, assignments and deletions across independent reloads, preserving unrelated stores", () => {
    const storage = memory();
    storage.setItem("portal-os-alpha-v1", "portal sentinel");
    storage.setItem("max-sim-workbench-v2", "kernel sentinel");
    const registry = createIdentityRegistry({ storage });
    registry.saveCapability(capability);
    const human = registry.registerIdentity({
      type: "human",
      name: "Alice",
      capabilities: ["research"],
    });
    registry.assignRole(human.id, "Admin");
    registry.updateIdentity(human.id, { name: "Alice Jones" });
    let restored = createIdentityRegistry({ storage });
    expect(restored.listIdentities()).toEqual(registry.listIdentities());
    expect(restored.getSnapshot().capabilities).toEqual([capability]);
    expect(JSON.parse(registry.exportRegistry())).toEqual(
      JSON.parse(storage.getItem(IDENTITY_STORAGE_KEY)!),
    );
    restored.removeIdentity(human.id);
    restored = createIdentityRegistry({ storage });
    expect(restored.listIdentities()).toEqual([]);
    expect(storage.getItem("portal-os-alpha-v1")).toBe("portal sentinel");
    expect(storage.getItem("max-sim-workbench-v2")).toBe("kernel sentinel");
  });

  it("isolates all returned values, input references and snapshots from mutation", () => {
    const registry = createIdentityRegistry({ now: () => date });
    const roles = ["Founder"];
    const input = { ...capability };
    const saved = registry.saveCapability(input);
    const created = registry.registerIdentity({ ...fixture, roles });
    roles.push("Admin");
    input.name = "Mutated";
    saved.name = "Mutated";
    created.roles.push("Observer");
    registry.findIdentity(fixture.id)!.name = "Mutated";
    registry.listIdentities()[0].capabilities.push("unknown");
    expect(registry.findIdentity(fixture.id)).toEqual(fixture);
    expect(registry.getSnapshot().capabilities[0]).toEqual(capability);
    expect(() => {
      registry.getSnapshot().identities[0].name = "Mutated";
    }).toThrow();
    expect(() => {
      registry.getSnapshot().identities.push(fixture);
    }).toThrow();
  });

  it("does not commit quota failures and allows a successful retry", () => {
    const storage = memory();
    const registry = createIdentityRegistry({ storage, now: () => date });
    registry.registerIdentity(fixture);
    const previous = registry.getSnapshot();
    const raw = storage.getItem(IDENTITY_STORAGE_KEY);
    const listener = vi.fn();
    registry.subscribe(listener);
    const spy = vi.spyOn(storage, "setItem").mockImplementation(() => {
      throw new Error("Quota");
    });
    expect(() => registry.updateIdentity(fixture.id, { name: "New" })).toThrow(
      "Unable to save",
    );
    expect(registry.getSnapshot()).toBe(previous);
    expect(storage.getItem(IDENTITY_STORAGE_KEY)).toBe(raw);
    expect(listener).not.toHaveBeenCalled();
    spy.mockRestore();
    registry.updateIdentity(fixture.id, { name: "New" });
    expect(registry.findIdentity(fixture.id)!.name).toBe("New");
  });

  it("protects corrupt storage and handles unavailable storage with explicit recovery", () => {
    const storage = memory("{broken");
    const registry = createIdentityRegistry({ storage });
    expect(registry.getSnapshot().recovery).toBe("{broken");
    expect(() =>
      registry.registerIdentity({ name: "No overwrite", type: "human" }),
    ).toThrow("paused");
    expect(storage.getItem(IDENTITY_STORAGE_KEY)).toBe("{broken");
    registry.replaceSaved();
    expect(registry.getSnapshot().error).toBe("");
    expect(registry.getSnapshot().recovery).toBeNull();
    expect(JSON.parse(storage.getItem(IDENTITY_STORAGE_KEY)!)).toEqual(data());
    const unavailable = createIdentityRegistry({
      storage: {
        getItem: () => {
          throw new Error("Blocked");
        },
        setItem: () => {},
      },
    });
    expect(unavailable.getSnapshot().error).toContain("paused");
    expect(unavailable.getSnapshot().recovery).toBeNull();
    unavailable.replaceSaved();
    expect(unavailable.getSnapshot().error).toBe("");
  });

  it("rejects malformed persisted collections, duplicate IDs, and dangling references", () => {
    const invalid = [
      null,
      [],
      "bad",
      {},
      { ...data(), version: 2 },
      data(null),
      data([], {}),
      data(Array(501).fill(fixture)),
      data([], Array(501).fill(capability)),
      data([fixture, fixture]),
      data([], [capability, capability]),
      data([{ ...fixture, capabilities: ["unknown"] }]),
      data([{ ...fixture, roles: ["Unknown"] }]),
    ];
    for (const value of invalid) {
      const raw = JSON.stringify(value);
      const storage = memory(raw);
      const registry = createIdentityRegistry({ storage });
      expect(registry.getSnapshot().error).toContain("paused");
      expect(registry.getSnapshot().recovery).toBe(raw);
      expect(storage.getItem(IDENTITY_STORAGE_KEY)).toBe(raw);
    }
  });

  it("validates all identity fields and timestamp order at runtime", () => {
    for (const value of [
      null,
      [],
      false,
      "bad",
      { ...fixture, type: "robot" },
      { ...fixture, id: 7 },
      { ...fixture, name: " " },
      { ...fixture, name: "x".repeat(201) },
      { ...fixture, roles: {} },
      { ...fixture, roles: Array(201).fill("Founder") },
      { ...fixture, roles: ["Founder", "Founder"] },
      { ...fixture, capabilities: [7] },
      { ...fixture, createdAt: "bad" },
      { ...fixture, updatedAt: "2026-10-26" },
      { ...fixture, createdAt: later, updatedAt: date },
    ]) {
      expect(() => validateIdentity(value)).toThrow();
    }
    expect(validateIdentity({ ...fixture, name: "  Founder  " })).toEqual(
      fixture,
    );
    const registry = createIdentityRegistry({ now: () => date });
    registry.registerIdentity(fixture);
    const previous = registry.getSnapshot();
    expect(() => registry.updateIdentity(fixture.id, { name: "" })).toThrow();
    expect(registry.getSnapshot()).toBe(previous);
  });

  it("validates capability fields and the inclusive numeric proficiency range", () => {
    for (const proficiency of ["50", NaN, Infinity, -1, 101])
      expect(() => validateCapability({ ...capability, proficiency })).toThrow(
        "0 to 100",
      );
    for (const field of ["id", "name", "category"])
      expect(() =>
        validateCapability({ ...capability, [field]: "" }),
      ).toThrow();
    for (const proficiency of [0, 12.5, 100])
      expect(
        validateCapability({ ...capability, proficiency }).proficiency,
      ).toBe(proficiency);
  });

  it("builds canonical capability vectors without mutating identities or catalog order", () => {
    const catalog = [
      { ...capability, id: "z", proficiency: 100 },
      { ...capability, id: "a", proficiency: 50 },
    ];
    expect(
      capabilityVector({ ...fixture, capabilities: ["a"] }, catalog),
    ).toEqual({
      identityId: fixture.id,
      dimensions: ["a", "z"],
      values: [0.5, 0],
    });
    expect(catalog.map((item) => item.id)).toEqual(["z", "a"]);
    expect(capabilityVector(fixture, [])).toEqual({
      identityId: fixture.id,
      dimensions: [],
      values: [],
    });
  });

  it("exposes the singleton CRUD API with generated identifiers and current timestamps", () => {
    const identity = registerIdentity({
      name: "Singleton",
      type: "organization",
    });
    expect(Number.isFinite(Date.parse(identity.createdAt))).toBe(true);
    expect(identity.id).toBeTruthy();
    updateIdentity(identity.id, { name: "Singleton updated" });
    expect(findIdentity(identity.id)!.name).toBe("Singleton updated");
    expect(listIdentities()).toEqual(identityRegistry.listIdentities());
    expect(removeIdentity(identity.id)).toBe(true);
  });
});
