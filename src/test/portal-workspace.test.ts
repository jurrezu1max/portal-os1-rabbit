// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  newWorkspace,
  validateWorkspace,
  importWorkspace,
  exportWorkspace,
  usePortal,
  PORTAL_STORAGE_KEY,
  sourceFields,
} from "../portal/workspace";
import { populatedWorkspace, evidence } from "./portal-fixtures";
import { PMD_ASSESSORS } from "../pmd/registry";
import { progressAsset } from "../gsip/pipeline";
import { recordRevenue } from "../gsip/revenue";
import { createMission } from "../mission/planning";
beforeEach(() => {
  localStorage.clear();
  usePortal.setState({ data: newWorkspace(), error: "", recovery: null });
});
describe("Portal import and persistence integrity", () => {
  it("round trips every collection, recomputes derived scores and isolates workbench storage", () => {
    const workspace = populatedWorkspace();
    workspace.initiatives = [
      PMD_ASSESSORS.ai({
        id: "initiative-1",
        title: "Pilot",
        owner: "Founder",
        status: "active",
        priority: "high",
        stage: "pilot",
        completedChecks: 1,
        totalChecks: 2,
        matchedGoals: 1,
        totalGoals: 1,
      }),
    ];
    workspace.missions = [
      createMission("action-1", "Review pilot", "Founder", "normal"),
    ];
    const input = {
      ...workspace,
      initiatives: workspace.initiatives.map((i) => ({
        ...i,
        readinessScore: 999,
      })),
    };
    expect(validateWorkspace(input).initiatives[0].readinessScore).toBe(50);
    expect(importWorkspace(exportWorkspace(workspace))).toEqual(workspace);
    localStorage.setItem("max-sim-workbench-v2", "sentinel");
    usePortal.getState().restore(exportWorkspace(workspace));
    expect(JSON.parse(localStorage.getItem(PORTAL_STORAGE_KEY)!)).toEqual(
      workspace,
    );
    expect(localStorage.getItem("max-sim-workbench-v2")).toBe("sentinel");
    expect(sourceFields(" source ", "2026-10-26T10:00:00Z")).toEqual({
      source: "source",
      observedAt: evidence.observedAt,
    });
  });
  it("rejects malformed collections, duplicate IDs, broken references and impossible states atomically", () => {
    const fixture = populatedWorkspace();
    const bad: unknown[] = [
      null,
      [],
      "",
      { ...fixture, version: 2 },
      { ...fixture, name: "" },
      { ...fixture, name: 3 },
      { ...fixture, project: "x".repeat(201) },
      { ...fixture, goals: [3] },
      { ...fixture, goals: Array(101).fill("g") },
      { ...fixture, goals: "bad" },
      { ...fixture, observations: {} },
      { ...fixture, observations: Array(201).fill(fixture.observations[0]) },
      { ...fixture, observations: [null] },
      { ...fixture, markets: [fixture.markets[0], fixture.markets[0]] },
      { ...fixture, assets: [{ ...fixture.assets[0], marketId: "missing" }] },
      {
        ...fixture,
        compliance: [{ ...fixture.compliance[0], assetId: "missing" }],
      },
      { ...fixture, assets: [{ ...fixture.assets[0], stage: "invalid" }] },
      {
        ...fixture,
        assets: [{ ...fixture.assets[0], history: ["creation", "media"] }],
      },
      { ...fixture, assets: [{ ...fixture.assets[0], annualRevenue: 10 }] },
      {
        ...fixture,
        assets: [{ ...fixture.assets[0], revenueState: "earning" }],
      },
      {
        ...fixture,
        compliance: [{ ...fixture.compliance[0], approved: "yes" }],
      },
      {
        ...fixture,
        compliance: [{ ...fixture.compliance[0], likelihood: 1.5 }],
      },
      {
        ...fixture,
        observations: [{ ...fixture.observations[0], value: "10" }],
      },
    ];
    for (const value of bad) expect(() => validateWorkspace(value)).toThrow();
    expect(() => importWorkspace("x".repeat(2_000_001))).toThrow("2 MB");
    expect(() => importWorkspace("{broken")).toThrow();
    const before = usePortal.getState();
    expect(() => usePortal.getState().restore("{bad")).toThrow();
    expect(usePortal.getState()).toBe(before);
  });
  it("checks earning and expansion states against stage history", () => {
    const workspace = populatedWorkspace();
    let asset = workspace.assets[0];
    for (let i = 0; i < 6; i++) asset = progressAsset(asset);
    expect(
      validateWorkspace({ ...workspace, assets: [asset] }).assets[0]
        .revenueState,
    ).toBe("eligible");
    expect(() =>
      validateWorkspace({
        ...workspace,
        assets: [{ ...asset, revenueState: "none" }],
      }),
    ).toThrow("revenue");
    asset = progressAsset(recordRevenue(asset, 10));
    expect(
      validateWorkspace({ ...workspace, assets: [asset] }).assets[0].stage,
    ).toBe("expansion");
    // Revenue may fall after expansion; the positive-revenue gate applies at entry.
    expect(
      validateWorkspace({ ...workspace, assets: [recordRevenue(asset, 0)] })
        .assets[0].annualRevenue,
    ).toBe(0);
  });
  it("preserves corrupted copies and shows quota failures without losing in-memory edits", () => {
    const raw = "{broken";
    localStorage.setItem(PORTAL_STORAGE_KEY, raw);
    usePortal.setState({ recovery: raw, error: "Corrupt" });
    usePortal.getState().update((w) => ({ ...w, name: "Recovery session" }));
    expect(localStorage.getItem(PORTAL_STORAGE_KEY)).toBe(raw);
    expect(usePortal.getState().data.name).toBe("Recovery session");
    usePortal.getState().replaceSaved();
    expect(usePortal.getState().recovery).toBeNull();
    const spy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("Quota");
      });
    try {
      usePortal.getState().update((w) => ({ ...w, name: "In memory" }));
      expect(usePortal.getState().data.name).toBe("In memory");
      expect(usePortal.getState().error).toContain("storage");
    } finally {
      spy.mockRestore();
    }
  });
  it("retains rule inputs on each evidence revision and protects history during ordinary updates", () => {
    usePortal.getState().restore(exportWorkspace(populatedWorkspace()));
    usePortal.getState().update((w) => ({
      ...w,
      compliance: w.compliance.map((r) => ({ ...r, license: "" })),
    }));
    const history = usePortal.getState().data.auditHistory;
    expect(history.map((h) => h.revision)).toEqual([1, 2]);
    expect(history.map((h) => h.record.license)).toEqual(["CC-BY-4.0", ""]);
    usePortal
      .getState()
      .update((w) => ({ ...w, name: "Renamed", auditHistory: [] }));
    expect(usePortal.getState().data.auditHistory).toEqual(history);
    const exported = exportWorkspace(usePortal.getState().data);
    expect(importWorkspace(exported).auditHistory).toEqual(history);
    for (const patch of [
      { revision: 2 },
      { rulesVersion: 2 },
      { evaluatedAt: "invalid" },
      { record: { ...history[0].record, id: "missing" } },
    ]) {
      expect(() =>
        validateWorkspace({
          ...usePortal.getState().data,
          auditHistory: [{ ...history[0], ...patch }],
        }),
      ).toThrow();
    }
    expect(() =>
      validateWorkspace({
        ...usePortal.getState().data,
        auditHistory: [history[0]],
      }),
    ).toThrow("Latest audit");
    expect(() =>
      validateWorkspace({
        ...usePortal.getState().data,
        auditHistory: Array(2001).fill(history[0]),
      }),
    ).toThrow("2000");
    usePortal.getState().update((w) => ({
      ...w,
      compliance: [...w.compliance, { ...w.compliance[0], id: "second" }],
    }));
    expect(usePortal.getState().data.auditHistory.at(-1)?.revision).toBe(1);
  });
  it("loads valid data and preserves unreadable stored data on module initialization", async () => {
    localStorage.setItem(
      PORTAL_STORAGE_KEY,
      exportWorkspace(populatedWorkspace()),
    );
    vi.resetModules();
    const loaded = await import("../portal/workspace");
    expect(loaded.usePortal.getState().data.assets).toHaveLength(1);
    localStorage.setItem(PORTAL_STORAGE_KEY, "{broken");
    vi.resetModules();
    const broken = await import("../portal/workspace");
    expect(broken.usePortal.getState().recovery).toBe("{broken");
    expect(localStorage.getItem(PORTAL_STORAGE_KEY)).toBe("{broken");
    localStorage.setItem(PORTAL_STORAGE_KEY, "null");
    vi.resetModules();
    expect(
      (await import("../portal/workspace")).usePortal.getState().recovery,
    ).toBe("null");
    const spy = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("Denied");
      });
    try {
      vi.resetModules();
      expect(
        (await import("../portal/workspace")).usePortal.getState().error,
      ).toContain("unavailable");
    } finally {
      spy.mockRestore();
    }
  });
});
