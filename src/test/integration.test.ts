import { describe, it, expect, vi } from "vitest";
import { integrationSetup, memory, date } from "./integration-fixtures";
import {
  createPortalSystem,
  INTEGRATION_STORAGE_KEY,
} from "../integration/system";
import { identityAssets, identityProfile } from "../integration/identityBridge";
import {
  marketConnections,
  connectedOpportunities,
} from "../integration/marketBridge";
import { connectedAgentInput } from "../integration/agentBridge";
import {
  systemCompliance,
  reviseCompliance,
} from "../integration/complianceBridge";
import { compliance, market } from "./portal-fixtures";
import { ASSET_STATUSES } from "../gsip/registry/types";
describe("connected Portal system", () => {
  it("joins live identities, receipts, markets, PMD, research and graph without changing legacy assets", () => {
    const f = integrationSetup(),
      s = f.system;
    const original = f.portal.getState().data.assets;
    const listener = vi.fn(),
      stop = s.subscribe(listener);
    const initial = s.getSnapshot();
    expect(s.getSnapshot()).toBe(initial);
    expect(Object.isFrozen(initial.assets)).toBe(true);
    expect(initial.issues).toEqual([
      "Choose a market link for Registered report.",
    ]);
    s.selectIdentity("owner");
    s.linkAsset("registered", market.id);
    s.linkInitiative(market.id, "initiative");
    s.linkInitiative(market.id, "initiative");
    s.assignAgent("initiative", "market");
    s.assignAgent("initiative", "market");
    s.bindAgent("market", "bot");
    s.bindAgent("market", "bot");
    const state = s.getSnapshot();
    expect(state.profile.id).toBe("owner");
    expect(state.issues).toEqual([]);
    expect(state.connections.marketInitiatives).toHaveLength(1);
    expect(state.connections.assignments).toHaveLength(1);
    expect(state.connections.agentIdentities).toHaveLength(1);
    expect(identityAssets("owner", state.assets)[0].id).toBe("registered");
    expect(identityAssets("bot", state.assets)).toEqual([]);
    expect(
      marketConnections(
        state.workspace,
        state.assets,
        state.connections.marketInitiatives,
      )[0].initiatives[0].id,
    ).toBe("initiative");
    expect(state.opportunities[0].id).toBe(market.id);
    for (const status of ASSET_STATUSES.slice(1, 7))
      f.registry.updateAsset("registered", { status });
    f.registry.recordRevenue({
      assetId: "registered",
      amount: 125.5,
      source: "Sale",
    });
    expect(s.getSnapshot().revenue).toBe(125.5);
    expect(s.registryWorkspace().assets[0].annualRevenue).toBe(0);
    expect(s.registryWorkspace().assets[0].revenueState).toBe("eligible");
    f.graph.setState({
      graph: { ...f.graph.getState().graph, nodes: [{} as never] },
    });
    expect(s.getSnapshot().architecture.nodes).toBe(1);
    expect(f.portal.getState().data.assets).toBe(original);
    expect(listener).toHaveBeenCalled();
    const persisted = createPortalSystem(f);
    expect(persisted.getSnapshot().connections).toEqual(
      s.getSnapshot().connections,
    );
    s.unbindAgent("market");
    s.unassignAgent("initiative", "market");
    s.unlinkInitiative(market.id, "initiative");
    s.selectIdentity(null);
    expect(s.getSnapshot().connections.agentIdentities).toEqual([]);
    expect(s.getSnapshot().connections.assignments).toEqual([]);
    expect(s.getSnapshot().connections.marketInitiatives).toEqual([]);
    stop();
    listener.mockClear();
    s.selectIdentity("owner");
    f.portal.setState({ error: "offline" });
    expect(listener).not.toHaveBeenCalled();
    expect(s.getSnapshot().issues).toContain("offline");
  });
  it("runs scoped agents against shared evidence and invalidates recommendations when inputs change", () => {
    const f = integrationSetup(),
      s = f.system;
    s.linkAsset("registered", market.id);
    s.linkInitiative(market.id, "initiative");
    s.assignAgent("initiative", "market");
    s.bindAgent("market", "bot");
    s.runAgents("Check missing coverage");
    expect(
      s.getSnapshot().agents.find((a) => a.id === "compliance")?.status,
    ).toBe("needs-evidence");
    s.updateRegistryCompliance((w) => ({
      ...w,
      compliance: [{ ...compliance, id: "reg-check", assetId: "registered" }],
    }));
    const input = connectedAgentInput(
      "market",
      "Prioritize",
      f.portal.getState().data,
      f.identities.listIdentities(),
      f.registry.listAssets(),
      s.getSnapshot().connections,
    );
    expect(input.prompt).toContain("Climate plan");
    expect(input.markets).toHaveLength(1);
    expect(input.compliance).toHaveLength(2);
    expect(input.missions[0].id).toBe("pmd:initiative");
    const results = s.runAgents("Prioritize sourced opportunities");
    expect(Object.keys(results)).toHaveLength(5);
    expect(
      s
        .getSnapshot()
        .agents.every((a) => a.status !== "idle" && a.status !== "stale"),
    ).toBe(true);
    f.portal.setState(({ data }) => ({
      data: {
        ...data,
        initiatives: data.initiatives.map((i) => ({
          ...i,
          status: "complete",
        })),
      },
    }));
    expect(s.getSnapshot().agents.find((a) => a.id === "market")?.status).toBe(
      "stale",
    );
    s.runAgents("Review completed plan");
    expect(
      connectedAgentInput(
        "market",
        "x",
        f.portal.getState().data,
        [],
        [],
        s.getSnapshot().connections,
      ).missions[0].status,
    ).toBe("complete");
    f.portal.setState(({ data }) => ({ data: { ...data, initiatives: [] } }));
    expect(
      connectedAgentInput(
        "market",
        "x",
        f.portal.getState().data,
        [],
        [],
        s.getSnapshot().connections,
      ).markets,
    ).toEqual([]);
    expect(s.getSnapshot().issues.join(" ")).toContain("Missing PMD");
    expect(() => s.runAgents(" ")).toThrow("prompt");
    expect(() => s.runAgents("a".repeat(20001))).toThrow("prompt");
  });
  it("retains audit revisions, detects ownership changes and never mutates the legacy audit store", () => {
    const f = integrationSetup(),
      s = f.system,
      record = { ...compliance, assetId: "registered" };
    expect(s.getSnapshot().compliance.status).toBe("review");
    s.updateRegistryCompliance((w) => ({ ...w, compliance: [record] }));
    expect(s.getSnapshot().compliance.status).toBe("pass");
    s.updateRegistryCompliance((w) => w);
    expect(s.getSnapshot().connections.auditHistory).toHaveLength(1);
    s.updateRegistryCompliance((w) => ({
      ...w,
      compliance: [{ ...record, approved: false }],
    }));
    expect(s.getSnapshot().connections.auditHistory).toHaveLength(2);
    expect(s.getSnapshot().compliance.status).toBe("review");
    expect(f.portal.getState().data.compliance).toEqual([compliance]);
    expect(createPortalSystem(f).getSnapshot().connections).toEqual(
      s.getSnapshot().connections,
    );
    expect(() =>
      s.updateRegistryCompliance((w) => ({ ...w, compliance: [] })),
    ).toThrow("deleted");
    expect(() =>
      reviseCompliance([record, record], [], [], ["registered"], date),
    ).toThrow("Duplicate");
    expect(() =>
      reviseCompliance(
        [{ ...record, assetId: "other" }],
        [record],
        [],
        ["other"],
        date,
      ),
    ).toThrow("reassigned");
    expect(() => reviseCompliance([record], [], [], [], date)).toThrow(
      "not found",
    );
    s.runAgents("Review current evidence");
    f.registry.updateAsset("registered", { ownerId: "bot" });
    expect(
      s.getSnapshot().agents.find((a) => a.id === "compliance")?.status,
    ).toBe("stale");
    s.runAgents("Review transferred asset");
    expect(
      s
        .getSnapshot()
        .agents.find((a) => a.id === "compliance")
        ?.result?.reasoning.join(" "),
    ).toContain("current registered owner");
    expect(
      s
        .getSnapshot()
        .compliance.decisions.find((d) => d.rule === "registry-ownership")
        ?.status,
    ).toBe("review");
    f.identities.removeIdentity("bot");
    expect(
      s
        .getSnapshot()
        .compliance.decisions.find((d) => d.rule === "registry-ownership")
        ?.reasons[0],
    ).toContain("missing");
    expect(s.registryWorkspace().assets[0].owner).toBe("bot");
    expect(
      systemCompliance(
        [],
        [record],
        { ...f.portal.getState().data, compliance: [], assets: [] },
        [],
      ).reviewCount,
    ).toBe(1);
    expect(
      systemCompliance(
        [],
        [],
        { ...f.portal.getState().data, compliance: [], assets: [] },
        [],
      ).status,
    ).toBe("unreviewed");
  });
  it("rejects invalid relationships and reports dangling references instead of discarding records", () => {
    const f = integrationSetup(),
      s = f.system;
    expect(() => s.selectIdentity("missing")).toThrow("not found");
    expect(() => s.linkAsset("registered", "missing")).toThrow("Market");
    expect(() => s.linkAsset("missing", market.id)).toThrow();
    expect(() => s.linkInitiative("missing", "initiative")).toThrow("existing");
    expect(() => s.linkInitiative(market.id, "missing")).toThrow("existing");
    expect(() => s.assignAgent("missing", "market")).toThrow("not found");
    expect(() => s.assignAgent("initiative", "bad" as never)).toThrow(
      "Unknown",
    );
    expect(() => s.bindAgent("bad" as never, "bot")).toThrow("Unknown");
    expect(() => s.bindAgent("market", "owner")).toThrow("type agent");
    s.selectIdentity("owner");
    s.bindAgent("market", "bot");
    s.linkInitiative(market.id, "initiative");
    f.identities.removeIdentity("owner");
    f.identities.removeIdentity("bot");
    f.portal.setState(({ data }) => ({ data: { ...data, markets: [] } }));
    expect(s.getSnapshot().issues.join(" ")).toMatch(
      /Active identity.*Missing owner.*Choose a market.*Broken market.*Missing agent identity/,
    );
    expect(s.getSnapshot().profile).toEqual(f.portal.getState().data.profile);
    const ids = integrationSetup().identities.listIdentities();
    expect(
      identityProfile(
        [{ ...ids[0], roles: ["Researcher"] }],
        "owner",
        s.getSnapshot().profile,
      ).role,
    ).toBe("researcher");
    expect(identityProfile([ids[1]], "bot", s.getSnapshot().profile).role).toBe(
      "analyst",
    );
    expect(
      connectedOpportunities({
        ...f.portal.getState().data,
        markets: [market, { ...market, id: "second", annualGrowth: 0 }],
      }),
    ).toHaveLength(2);
  });
  it("preserves corrupt saved data, rejects malformed audit chains, and makes writes atomic", () => {
    const base = integrationSetup().system.getSnapshot().connections;
    const record = { ...compliance, assetId: "registered" };
    const revision = {
      revision: 1,
      evaluatedAt: date,
      rulesVersion: 1,
      record,
    };
    const invalid: unknown[] = [
      null,
      { ...base, version: 2 },
      { ...base, assignments: null },
      { ...base, marketInitiatives: Array(201).fill({}) },
      { ...base, assignments: [{ initiativeId: "x", agentId: "bad" }] },
      {
        ...base,
        agentIdentities: [
          { agentId: "market", identityId: "bot" },
          { agentId: "market", identityId: "bot" },
        ],
      },
      { ...base, compliance: [record] },
      { ...base, auditHistory: [revision] },
      {
        ...base,
        compliance: [record],
        auditHistory: [{ ...revision, revision: 2 }],
      },
      {
        ...base,
        compliance: [record],
        auditHistory: [{ ...revision, rulesVersion: 2 }],
      },
      {
        ...base,
        compliance: [record],
        auditHistory: [
          { ...revision, record: { ...record, assetId: "wrong" } },
        ],
      },
      {
        ...base,
        compliance: [record],
        auditHistory: [{ ...revision, record: { ...record, approved: false } }],
      },
      { ...base, compliance: [record], auditHistory: [revision, revision] },
    ];
    for (const value of invalid) {
      const raw = JSON.stringify(value),
        storage = memory(raw),
        f = integrationSetup(storage);
      expect(f.system.getSnapshot().recovery).toBe(raw);
      expect(() => f.system.selectIdentity("owner")).toThrow("paused");
      expect(storage.getItem(INTEGRATION_STORAGE_KEY)).toBe(raw);
      f.system.replaceSaved();
      expect(f.system.getSnapshot().error).toBe("");
    }
    expect(
      integrationSetup(memory("x".repeat(2_000_001))).system.getSnapshot()
        .error,
    ).toContain("paused");
    const f = integrationSetup(),
      before = f.system.getSnapshot();
    vi.spyOn(f.storage, "setItem").mockImplementation(() => {
      throw Error("quota");
    });
    expect(() => f.system.selectIdentity("owner")).toThrow("Unable to save");
    expect(f.system.getSnapshot()).toBe(before);
    const unreadable = {
      getItem: () => {
        throw Error("blocked");
      },
      setItem: vi.fn(),
    };
    expect(
      createPortalSystem({ ...f, storage: unreadable }).getSnapshot().recovery,
    ).toBe(null);
    const missing = { ...base, compliance: [record], auditHistory: [revision] };
    const g = integrationSetup(memory(JSON.stringify(missing)));
    // The persisted audit refers to an asset removed from a separately restored registry.
    const missingRecord = { ...record, assetId: "absent" };
    const orphan = integrationSetup(
      memory(
        JSON.stringify({
          ...base,
          compliance: [missingRecord],
          auditHistory: [{ ...revision, record: missingRecord }],
        }),
      ),
    );
    expect(orphan.system.getSnapshot().issues.join(" ")).toContain(
      "Missing registry asset",
    );
    expect(g.system.getSnapshot().error).toBe("");
  });
});
