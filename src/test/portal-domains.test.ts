import { describe, expect, it } from "vitest";
import {
  validateEvidence,
  validateObservation,
  finite,
  requireText,
} from "../portal/contracts";
import { DASHBOARDS, isDashboard } from "../portal/navigation";
import { resolveRoute, routeFor } from "../portal/routing";
import { routeCommand, executePortalCommand } from "../portal/commands";
import { composeDashboard } from "../portal/dashboard";
import { createContext } from "../icv/context";
import { createProfile, AGENT_REGISTRY } from "../icv/identity";
import { extractMeaning } from "../icv/meaning";
import { assessCoherence } from "../icv/coherence";
import { verifyEvidence } from "../icv/verification";
import { planAction } from "../icv/strategy";
import { createAsset, advanceAsset, STAGES } from "../gsip/creation";
import { progressAsset } from "../gsip/pipeline";
import { recordRevenue } from "../gsip/revenue";
import { scanMarket } from "../markets/scanner";
import { sizeMarket } from "../markets/tam";
import { marketTrends } from "../markets/trends";
import { forecastMarket } from "../markets/forecast";
import { evaluateOpportunity } from "../markets/opportunities";
import { PMD_ASSESSORS } from "../pmd/registry";
import { assessInitiative } from "../pmd/contracts";
import { auditCompliance } from "../compliance/audit";
import { assessRisk } from "../compliance/risk";
import { planetaryIndicators, INDICATORS } from "../umbrella/dashboard";
import { latestIndicator } from "../umbrella/analytics";
import { AGENTS } from "../agents/registry";
import { recommendation } from "../agents/contracts";
import { createMission, prioritize } from "../mission/planning";
import {
  evidence,
  observation,
  market,
  compliance,
  populatedWorkspace,
} from "./portal-fixtures";
import { useWorkbench } from "../state/workbench";
import { SAMPLE } from "../data/sample";
const context = createContext(
  "session-1",
  "Workspace",
  "Project",
  ["research climate"],
  createProfile("Founder", "founder"),
);
const initiative = {
  id: "i-1",
  title: "Pilot",
  status: "planned" as const,
  priority: "high" as const,
  stage: "discovery" as const,
  owner: "Founder",
  completedChecks: 2,
  totalChecks: 4,
  matchedGoals: 1,
  totalGoals: 2,
};
describe("source and identity contracts", () => {
  it("validates finite values, references, source times and metadata", () => {
    expect(validateObservation(observation)).toEqual(observation);
    expect(validateObservation(observation)).not.toBe(observation);
    for (const value of ["", " ".repeat(3), "x".repeat(201)])
      expect(() => requireText(value, "Name")).toThrow();
    expect(requireText(" name ", "Name")).toBe("name");
    for (const value of [NaN, Infinity, -1, Number.MAX_SAFE_INTEGER + 1])
      expect(() => finite(value, "Score")).toThrow();
    expect(() =>
      validateEvidence({ source: "", observedAt: evidence.observedAt }),
    ).toThrow();
    for (const observedAt of ["bad", "2026-99-99T00:00:00Z", "2026-10-26"])
      expect(() => validateEvidence({ source: "Study", observedAt })).toThrow();
    for (const role of ["founder", "researcher", "analyst"] as const)
      expect(createProfile(" A ", role).role).toBe(role);
    expect(() => createProfile("A", "bad" as "founder")).toThrow();
    expect(AGENT_REGISTRY).toHaveLength(5);
    expect(() => createContext("", "W", "P", [], context.profile)).toThrow();
    expect(() => createContext("S", "W", "P", [""], context.profile)).toThrow();
  });
});
describe("ICV pipeline", () => {
  it("extracts entities and co-mentions without inventing causal relationships", () => {
    const meaning = extractMeaning(
      "Research climate risk market network education",
    );
    expect(meaning.classifications).toEqual([
      "markets",
      "research",
      "compliance",
      "infrastructure",
      "climate",
      "education",
    ]);
    expect(meaning.relationships[0]).toEqual({
      source: "research",
      target: "climate",
      kind: "co-mention",
    });
    expect(extractMeaning("!!!")).toEqual({
      tokens: [],
      entities: [],
      classifications: [],
      relationships: [],
    });
  });
  it("uses actual goal matches and flags explicit possible conflicts", () => {
    const meaning = extractMeaning("Research climate");
    expect(assessCoherence(meaning, context).alignment).toBe(100);
    expect(
      assessCoherence(extractMeaning("unrelated"), context).alignment,
    ).toBe(0);
    expect(
      assessCoherence(meaning, { ...context, goals: [] }).alignment,
    ).toBeNull();
    expect(
      assessCoherence(meaning, {
        ...context,
        goals: ["avoid climate", "never research"],
      }).conflicts,
    ).toHaveLength(2);
    expect(
      planAction("Research climate", context, [observation]).actions,
    ).toContain("Choose an owner and record the next action.");
    expect(
      planAction("Investigate volcanoes", context, [observation]).actions[0],
    ).toContain("unclassified");
    expect(planAction("research", context, []).actions[0]).toContain("Collect");
    expect(planAction("", context, []).actions).toEqual([]);
    expect(
      planAction("climate", { ...context, goals: ["avoid climate"] }, [
        observation,
      ]).priority,
    ).toBe("review");
    expect(
      planAction("climate", context, [{ ...observation, source: "" }])
        .actions[0],
    ).toContain("Repair");
  });
  it("refuses invalid or duplicate evidence and does not claim verified facts", () => {
    expect(verifyEvidence([observation])).toMatchObject({
      valid: true,
      verifiedFacts: 0,
    });
    expect(verifyEvidence([observation, observation]).issues[0]).toContain(
      "Duplicate",
    );
    expect(verifyEvidence([{ ...observation, value: NaN }]).valid).toBe(false);
  });
});
describe("GS-IP asset lifecycle", () => {
  it("preserves ownership and assignments while enforcing sequential stages", () => {
    let asset = createAsset("A", "Report", "Owner", "Research", "M");
    expect(() => advanceAsset(asset, "platform")).toThrow();
    expect(() => progressAsset({ ...asset, status: "paused" })).toThrow();
    expect(() => recordRevenue(asset, 100)).toThrow();
    expect(() => recordRevenue(asset, -1)).toThrow();
    for (const stage of STAGES.slice(1, 7)) {
      asset = progressAsset(asset);
      expect(asset.stage).toBe(stage);
    }
    expect(asset.revenueState).toBe("eligible");
    expect(() => progressAsset(asset)).toThrow("positive revenue");
    asset = recordRevenue(asset, 0);
    expect(asset.revenueState).toBe("eligible");
    asset = recordRevenue(asset, 50);
    expect(asset.revenueState).toBe("earning");
    asset = progressAsset(asset);
    expect(asset.history).toEqual(STAGES);
    expect(asset).toMatchObject({
      owner: "Owner",
      marketId: "M",
      annualRevenue: 50,
      stage: "expansion",
    });
    expect(recordRevenue(asset, 40).annualRevenue).toBe(40);
    expect(() => progressAsset(asset)).toThrow("already");
    expect(() => createAsset("", "Title", "Owner", "Category", "M")).toThrow();
  });
});
describe("market sizing and traceability", () => {
  it("computes sizing, scores and compound scenarios from supplied evidence", () => {
    expect(sizeMarket(market)).toMatchObject({
      tam: 100000,
      sam: 50000,
      som: 5000,
      ...evidence,
    });
    expect(marketTrends(market)).toMatchObject({
      growthScore: 60,
      competitionScore: 75,
      ...evidence,
    });
    expect(evaluateOpportunity(market).opportunityScore).toBeCloseTo(0.75);
    expect(forecastMarket(market, 3).value).toBeCloseTo(8640);
    expect(forecastMarket({ ...market, annualGrowth: -1 }, 1).value).toBe(0);
    expect(forecastMarket(market, 0).value).toBe(5000);
    expect(
      evaluateOpportunity({ ...market, competitors: 0 }).opportunityScore,
    ).toBeGreaterThan(evaluateOpportunity(market).opportunityScore);
    expect(scanMarket(market)).not.toBe(market);
  });
  it("rejects invalid denominators, negative counts, nonfinite sizing and invalid sources", () => {
    for (const patch of [
      { competitors: 1.5 },
      { annualGrowth: 2 },
      { customers: -1 },
      { annualSpend: Infinity },
      { source: "" },
      { serviceableFraction: 2 },
      { obtainableFraction: -0.1 },
      { customers: Number.MAX_SAFE_INTEGER, annualSpend: 10 },
    ])
      expect(() => scanMarket({ ...market, ...patch })).toThrow();
    for (const years of [-1, 11, NaN])
      expect(() => forecastMarket(market, years)).toThrow();
  });
});
describe("PMD and compliance", () => {
  it("scores every PMD domain from bounded integer check and goal counts", () => {
    for (const [domain, assess] of Object.entries(PMD_ASSESSORS))
      expect(assess(initiative)).toMatchObject({
        domain,
        readinessScore: 50,
        alignmentScore: 50,
      });
    for (const patch of [
      { totalChecks: 0 },
      { completedChecks: 5 },
      { matchedGoals: -1 },
      { totalGoals: 0 },
      { totalGoals: 2.5 },
      { status: "unknown" as "planned" },
      { priority: "unknown" as "high" },
      { stage: "unknown" as "discovery" },
      { owner: "" },
    ])
      expect(() =>
        assessInitiative("ai", { ...initiative, ...patch }),
      ).toThrow();
  });
  it("audits evidence completeness with versioned, traceable reasons", () => {
    const decisions = auditCompliance(compliance);
    expect(decisions).toHaveLength(5);
    expect(
      decisions.every(
        (d) =>
          d.status === "pass" &&
          d.version === 1 &&
          d.recordId === compliance.id &&
          d.source === evidence.source,
      ),
    ).toBe(true);
    const missing = {
      ...compliance,
      owner: "",
      copyright: "",
      trademark: "",
      license: "",
      personalData: true,
      lawfulBasis: "",
      retentionDays: null,
      reviewer: "",
      approved: false,
      likelihood: null,
      impact: null,
    };
    expect(auditCompliance(missing).every((d) => d.status === "review")).toBe(
      true,
    );
    expect(
      auditCompliance({
        ...missing,
        lawfulBasis: "Consent",
        retentionDays: 30,
      })[1].status,
    ).toBe("pass");
    expect(auditCompliance({ ...missing, retentionDays: -1 })[1].status).toBe(
      "review",
    );
    expect(
      assessRisk({ ...compliance, likelihood: 3, impact: 4 }),
    ).toMatchObject({ score: 12, status: "review" });
    expect(assessRisk({ ...compliance, impact: 6 }).score).toBeNull();
    expect(assessRisk({ ...compliance, likelihood: 1.5 }).score).toBeNull();
    expect(() => auditCompliance({ ...compliance, source: "" })).toThrow();
  });
});
describe("planetary evidence and missions", () => {
  it("selects the latest exact domain/metric/unit and preserves source attribution", () => {
    const indicators = planetaryIndicators([
      observation,
      {
        ...observation,
        id: "new",
        value: 20,
        observedAt: "2026-10-27T10:00:00Z",
      },
      { ...observation, unit: "kg", value: 30 },
    ]);
    expect(indicators).toHaveLength(9);
    expect(indicators.find((i) => i.domain === "climate")).toMatchObject({
      samples: 2,
      observation: { value: 20, source: evidence.source },
    });
    expect(latestIndicator(INDICATORS[0], []).observation).toBeNull();
    expect(() =>
      latestIndicator(INDICATORS[0], [{ ...observation, value: NaN }]),
    ).toThrow();
  });
  it("prioritizes open actions and validates ownership", () => {
    const low = createMission("z", "Task", "Owner", "low"),
      high = createMission("a", "Task", "Owner", "high");
    const actions = [
      low,
      { ...high, id: "b", status: "complete" as const },
      high,
      { ...high, id: "c" },
    ];
    expect(prioritize(actions).map((a) => a.id)).toEqual(["a", "c", "z", "b"]);
    expect(actions[0]).toBe(low);
    expect(() => createMission("a", "Task", "", "normal")).toThrow();
    expect(() =>
      createMission("a", "Task", "Owner", "other" as "normal"),
    ).toThrow();
  });
});
describe("agent network and Portal integration", () => {
  it("returns shared contracts and distinguishes missing evidence from recommendations", () => {
    const empty = {
      context,
      prompt: "research climate",
      evidence: [],
      markets: [],
      compliance: [],
      missions: [],
    };
    for (const agent of Object.values(AGENTS)) {
      const result = agent(empty);
      expect(result.status).toBe("needs-evidence");
      expect(result.confidence).toBe(0);
      expect(result.reasoning.every((r) => typeof r === "string")).toBe(true);
      expect(result.actions.length).toBeGreaterThan(0);
    }
    const input = {
      ...empty,
      evidence: [observation],
      markets: [market, { ...market, id: "m2", competitors: 0 }],
      compliance: [compliance],
      missions: [createMission("m1", "Review evidence", "Founder", "high")],
    };
    for (const agent of Object.values(AGENTS))
      expect(agent(input)).toMatchObject({
        status: "ready-for-review",
        confidence: 1,
      });
    expect(
      AGENTS.research({ ...input, evidence: [{ ...observation, source: "" }] })
        .confidence,
    ).toBe(0);
    expect(
      AGENTS.compliance({
        ...input,
        compliance: [{ ...compliance, license: "" }],
      }).actions,
    ).toContain("Record license terms or the relevant license identifier.");
    expect(
      AGENTS.strategy({
        ...input,
        context: { ...context, goals: ["avoid climate"] },
      }).status,
    ).toBe("needs-evidence");
    expect(recommendation([], [], 3, 1).confidence).toBe(1);
    expect(recommendation([], [], -1, 1).confidence).toBe(0);
    expect(recommendation([], [], 0, 0).confidence).toBe(0);
  });
  it("composes actual workspace state across domains and delegates legacy commands", () => {
    const workspace = populatedWorkspace();
    workspace.initiatives = [PMD_ASSESSORS.ai(initiative)];
    const summary = composeDashboard(workspace);
    expect(summary.assets.total).toBe(1);
    expect(summary.readiness).toBe(50);
    expect(
      composeDashboard({ ...workspace, initiatives: [] }).readiness,
    ).toBeNull();
    expect(summary.opportunities[0].som).toBe(5000);
    expect(summary.decisions).toHaveLength(5);
    for (const page of DASHBOARDS) {
      expect(isDashboard(page.id)).toBe(true);
      expect(resolveRoute(routeFor(page.id))).toBe(page.id);
      expect(routeCommand(`Open ${page.title}`)).toEqual({
        kind: "navigate",
        page: page.id,
      });
      expect(routeCommand(`open ${page.id}`)).toEqual({
        kind: "navigate",
        page: page.id,
      });
    }
    expect(resolveRoute("#/portal/missing")).toBeNull();
    expect(() => routeCommand("Open missing")).toThrow("Unknown");
    let destination = "";
    expect(
      executePortalCommand(
        "Open Research Console",
        (p) => {
          destination = p;
        },
        null,
        () => {},
      ),
    ).toBe("Dashboard opened.");
    expect(destination).toBe("research");
    useWorkbench.getState().replace(SAMPLE, "Fixture");
    expect(
      executePortalCommand(
        "Compute Identity Invariant",
        () => {},
        null,
        () => {},
      ),
    ).toContain("48.0000");
  });
});
