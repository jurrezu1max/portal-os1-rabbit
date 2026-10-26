import { createStore } from "zustand/vanilla";
import { createIdentityRegistry } from "../identity/registry";
import { createAssetRegistry } from "../gsip/registry/assetRegistry";
import {
  createPortalSystem,
  INTEGRATION_STORAGE_KEY,
} from "../integration/system";
import { populatedWorkspace } from "./portal-fixtures";
import { assessInitiative } from "../pmd/contracts";
import type { Architecture } from "../types";
export const date = "2026-10-26T12:00:00.000Z";
export function memory(raw: string | null = null) {
  const values = new Map<string, string>();
  if (raw !== null) values.set(INTEGRATION_STORAGE_KEY, raw);
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}
export function integrationSetup(storage = memory()) {
  const identities = createIdentityRegistry({ now: () => date });
  identities.registerIdentity({
    id: "owner",
    name: "Founder",
    type: "human",
    roles: ["Founder"],
  });
  identities.registerIdentity({
    id: "bot",
    name: "Market bot",
    type: "agent",
    roles: ["MarketAgent"],
  });
  const registry = createAssetRegistry({
    findIdentity: identities.findIdentity,
    now: () => date,
  });
  registry.createAsset({
    id: "registered",
    title: "Registered report",
    description: "Report",
    category: "Research",
    ownerId: "owner",
    market: "Unlinked",
  });
  const data = populatedWorkspace();
  data.initiatives = [
    assessInitiative("climate", {
      id: "initiative",
      title: "Climate plan",
      owner: "Founder",
      status: "active",
      priority: "high",
      stage: "pilot",
      completedChecks: 2,
      totalChecks: 3,
      matchedGoals: 1,
      totalGoals: 2,
    }),
  ];
  const portal = createStore(() => ({ data, error: "" }));
  const graph = createStore(() => ({
    graph: { nodes: [], edges: [] } as unknown as Architecture,
  }));
  const options = {
    identities,
    registry,
    portal,
    graph,
    storage,
    now: () => date,
  };
  return { ...options, system: createPortalSystem(options) };
}
