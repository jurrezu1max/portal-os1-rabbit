import { createId } from "../engine/id";
import { validateCapability } from "./capabilities";
import {
  record,
  text,
  validateIdentity,
  type Capability,
  type Identity,
  type IdentityInput,
  type IdentityUpdate,
} from "./types";

export const IDENTITY_STORAGE_KEY = "portal-os-identities-v1";
type RegistryStorage = Pick<Storage, "getItem" | "setItem">;
interface RegistryData {
  version: 1;
  identities: Identity[];
  capabilities: Capability[];
}
interface Snapshot extends RegistryData {
  error: string;
  recovery: string | null;
}

function validateData(value: unknown): RegistryData {
  const row = record(value);
  if (row.version !== 1) throw new Error("Unknown identity registry version.");
  function collection<T extends { id: string }>(
    value: unknown,
    read: (item: unknown) => T,
  ): T[] {
    if (!Array.isArray(value) || value.length > 500)
      throw new Error("Registry collections are limited to 500 records.");
    const result = value.map(read);
    if (new Set(result.map((item) => item.id)).size !== result.length)
      throw new Error("Duplicate registry IDs are not allowed.");
    return result;
  }
  const identities = collection(row.identities, validateIdentity);
  const capabilities = collection(row.capabilities, validateCapability);
  for (const identity of identities) {
    if (
      identity.capabilities.some(
        (id) => !capabilities.some((capability) => capability.id === id),
      )
    )
      throw new Error("Identity references an unknown capability.");
  }
  return { version: 1, identities, capabilities };
}

function freeze(snapshot: Snapshot): Snapshot {
  snapshot.identities.forEach((identity) => {
    Object.freeze(identity.roles);
    Object.freeze(identity.capabilities);
    Object.freeze(identity);
  });
  snapshot.capabilities.forEach(Object.freeze);
  Object.freeze(snapshot.identities);
  Object.freeze(snapshot.capabilities);
  return Object.freeze(snapshot);
}

/** Isolated registries support deterministic tests and future storage adapters. */
export function createIdentityRegistry({
  storage = null,
  now = () => new Date().toISOString(),
  generateId = createId,
}: {
  storage?: RegistryStorage | null;
  now?: () => string;
  generateId?: () => string;
} = {}) {
  let snapshot: Snapshot = {
    version: 1,
    identities: [],
    capabilities: [],
    error: "",
    recovery: null,
  };
  let raw: string | null = null;
  try {
    raw = storage?.getItem(IDENTITY_STORAGE_KEY) ?? null;
    if (raw !== null)
      snapshot = { ...snapshot, ...validateData(JSON.parse(raw)) };
  } catch {
    snapshot = {
      ...snapshot,
      error:
        "Saved identities could not be loaded. Writes are paused; download the original before replacing it.",
      recovery: raw,
    };
  }
  snapshot = freeze(snapshot);
  const listeners = new Set<() => void>();
  function commit(data: RegistryData, replace = false) {
    if (snapshot.error && !replace) throw new Error(snapshot.error);
    const checked = validateData(data);
    // Persist first: a failed write never reports a successful mutation.
    try {
      storage?.setItem(IDENTITY_STORAGE_KEY, JSON.stringify(checked));
    } catch {
      throw new Error(
        "Unable to save identities. Browser storage is unavailable or full; export the registry and retry.",
      );
    }
    snapshot = freeze({ ...checked, error: "", recovery: null });
    listeners.forEach((listener) => listener());
  }
  function required(id: string): Identity {
    const identity = snapshot.identities.find((item) => item.id === id);
    if (!identity) throw new Error(`Identity not found: ${id}.`);
    return identity;
  }
  const api = {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    registerIdentity(input: IdentityInput): Identity {
      const timestamp = now();
      const identity = validateIdentity({
        ...input,
        id: input.id ?? generateId(),
        roles: input.roles ?? [],
        capabilities: input.capabilities ?? [],
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      commit({ ...snapshot, identities: [...snapshot.identities, identity] });
      return structuredClone(identity);
    },
    updateIdentity(id: string, changes: IdentityUpdate): Identity {
      const previous = required(id);
      const identity = validateIdentity({
        ...previous,
        ...changes,
        id: previous.id,
        createdAt: previous.createdAt,
        updatedAt: now(),
      });
      commit({
        ...snapshot,
        identities: snapshot.identities.map((item) =>
          item.id === id ? identity : item,
        ),
      });
      return structuredClone(identity);
    },
    findIdentity(id: string): Identity | undefined {
      const identity = snapshot.identities.find((item) => item.id === id);
      return identity && structuredClone(identity);
    },
    removeIdentity(id: string): boolean {
      if (!snapshot.identities.some((item) => item.id === id)) return false;
      commit({
        ...snapshot,
        identities: snapshot.identities.filter((item) => item.id !== id),
      });
      return true;
    },
    listIdentities(type?: Identity["type"]): Identity[] {
      return structuredClone(
        snapshot.identities.filter(
          (item) => type === undefined || item.type === type,
        ),
      );
    },
    saveCapability(value: Capability): Capability {
      const capability = validateCapability(value);
      const capabilities = snapshot.capabilities.filter(
        (item) => item.id !== capability.id,
      );
      commit({ ...snapshot, capabilities: [...capabilities, capability] });
      return structuredClone(capability);
    },
    removeCapability(id: string): boolean {
      if (!snapshot.capabilities.some((item) => item.id === id)) return false;
      const timestamp = now();
      commit({
        ...snapshot,
        capabilities: snapshot.capabilities.filter((item) => item.id !== id),
        identities: snapshot.identities.map((identity) =>
          identity.capabilities.includes(id)
            ? {
                ...identity,
                capabilities: identity.capabilities.filter(
                  (value) => value !== id,
                ),
                updatedAt: timestamp,
              }
            : identity,
        ),
      });
      return true;
    },
    assignRole(id: string, role: string): Identity {
      const identity = required(id);
      return api.updateIdentity(id, {
        roles: [...new Set([...identity.roles, text(role)])],
      });
    },
    revokeRole(id: string, role: string): Identity {
      return api.updateIdentity(id, {
        roles: required(id).roles.filter((value) => value !== role),
      });
    },
    assignCapability(id: string, capabilityId: string): Identity {
      const identity = required(id);
      return api.updateIdentity(id, {
        capabilities: [
          ...new Set([...identity.capabilities, text(capabilityId)]),
        ],
      });
    },
    revokeCapability(id: string, capabilityId: string): Identity {
      return api.updateIdentity(id, {
        capabilities: required(id).capabilities.filter(
          (value) => value !== capabilityId,
        ),
      });
    },
    exportRegistry: () =>
      JSON.stringify(
        {
          version: 1,
          identities: snapshot.identities,
          capabilities: snapshot.capabilities,
        },
        null,
        2,
      ),
    replaceSaved: () => commit(snapshot, true),
  };
  return api;
}

export type IdentityRegistry = ReturnType<typeof createIdentityRegistry>;
export const identityRegistry = createIdentityRegistry({
  storage:
    typeof window === "undefined"
      ? null
      : {
          getItem: (key) => window.localStorage.getItem(key),
          setItem: (key, value) => window.localStorage.setItem(key, value),
        },
});
export const {
  registerIdentity,
  updateIdentity,
  findIdentity,
  removeIdentity,
  listIdentities,
} = identityRegistry;
