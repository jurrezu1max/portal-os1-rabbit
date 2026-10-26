import { create } from "zustand";
import { createId } from "../engine/id";
import { createProfile, type Profile } from "../icv/identity";
import {
  validateObservation,
  requireText,
  finite,
  validateEvidence,
  type Observation,
} from "./contracts";
import { scanMarket, type MarketInput } from "../markets/scanner";
import { createAsset, STAGES, type Asset } from "../gsip/creation";
import { PMD_ASSESSORS } from "../pmd/registry";
import { PMD_DOMAINS, type Initiative, type PMDDomain } from "../pmd/contracts";
import { auditCompliance } from "../compliance/audit";
import type { AuditRevision, ComplianceRecord } from "../compliance/contracts";
import { createMission, type MissionAction } from "../mission/planning";
export interface PortalWorkspace {
  version: 1;
  name: string;
  project: string;
  goals: string[];
  profile: Profile;
  observations: Observation[];
  markets: MarketInput[];
  assets: Asset[];
  initiatives: Initiative[];
  compliance: ComplianceRecord[];
  auditHistory: AuditRevision[];
  missions: MissionAction[];
}
export const PORTAL_STORAGE_KEY = "portal-os-alpha-v1";
export const sessionId = createId();
export function newWorkspace(): PortalWorkspace {
  return {
    version: 1,
    name: "Portal workspace",
    project: "Portal-OS Alpha",
    goals: [],
    profile: createProfile("Founder", "founder"),
    observations: [],
    markets: [],
    assets: [],
    initiatives: [],
    compliance: [],
    auditHistory: [],
    missions: [],
  };
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Expected a record.");
  return value as Record<string, unknown>;
}
function string(
  row: Record<string, unknown>,
  key: string,
  empty = false,
): string {
  const v = row[key];
  if (typeof v !== "string" || (!empty && !v.trim()) || v.length > 200)
    throw new Error(`Invalid ${key}.`);
  return v;
}
function number(row: Record<string, unknown>, key: string): number {
  const v = row[key];
  if (typeof v !== "number" || !Number.isFinite(v))
    throw new Error(`Invalid ${key}.`);
  return v;
}
function boolean(row: Record<string, unknown>, key: string): boolean {
  if (typeof row[key] !== "boolean") throw new Error(`Invalid ${key}.`);
  return row[key];
}
function oneOf<T extends string>(
  row: Record<string, unknown>,
  key: string,
  values: readonly T[],
): T {
  const value = string(row, key);
  const found = values.find((item) => item === value);
  if (!found) throw new Error(`Invalid ${key}.`);
  return found;
}
function strings(value: unknown): string[] {
  if (
    !Array.isArray(value) ||
    value.length > 100 ||
    !value.every(
      (v: unknown) => typeof v === "string" && v.trim() && v.length <= 200,
    )
  )
    throw new Error("Invalid text list.");
  return value as string[];
}
function records<T>(
  value: unknown,
  read: (row: Record<string, unknown>) => T,
  limit = 200,
): T[] {
  if (!Array.isArray(value) || value.length > limit)
    throw new Error(`A collection is limited to ${limit} records.`);
  return value.map((v: unknown) => read(object(v)));
}
const evidence = (row: Record<string, unknown>) => ({
  source: string(row, "source"),
  observedAt: string(row, "observedAt"),
});
function readCompliance(r: Record<string, unknown>): ComplianceRecord {
  const record: ComplianceRecord = {
    ...evidence(r),
    id: string(r, "id"),
    assetId: string(r, "assetId"),
    owner: string(r, "owner", true),
    copyright: string(r, "copyright", true),
    trademark: string(r, "trademark", true),
    license: string(r, "license", true),
    personalData: boolean(r, "personalData"),
    lawfulBasis: string(r, "lawfulBasis", true),
    retentionDays:
      r.retentionDays === null
        ? null
        : finite(number(r, "retentionDays"), "Retention", 1, 36500),
    reviewer: string(r, "reviewer", true),
    approved: boolean(r, "approved"),
    likelihood:
      r.likelihood === null
        ? null
        : finite(number(r, "likelihood"), "Likelihood", 1, 5),
    impact:
      r.impact === null ? null : finite(number(r, "impact"), "Impact", 1, 5),
  };
  if (
    [record.likelihood, record.impact, record.retentionDays].some(
      (v) => v !== null && !Number.isInteger(v),
    )
  )
    throw new Error("Risk and retention must use integer values.");
  auditCompliance(record);
  return record;
}
export function validateComplianceRecord(value: unknown): ComplianceRecord {
  return readCompliance(object(value));
}
/** Validate untrusted browser storage and imports, including cross-domain references. */
export function validateWorkspace(value: unknown): PortalWorkspace {
  const row = object(value);
  if (row.version !== 1)
    throw new Error("Unsupported Portal workspace version.");
  const profile = object(row.profile);
  const result: PortalWorkspace = {
    version: 1,
    name: string(row, "name"),
    project: string(row, "project"),
    goals: strings(row.goals),
    profile: createProfile(
      string(profile, "name"),
      oneOf(profile, "role", ["founder", "researcher", "analyst"]),
    ),
    observations: records(row.observations, (r) =>
      validateObservation({
        ...evidence(r),
        id: string(r, "id"),
        domain: string(r, "domain"),
        metric: string(r, "metric"),
        unit: string(r, "unit"),
        value: number(r, "value"),
      }),
    ),
    markets: records(row.markets, (r) =>
      scanMarket({
        ...evidence(r),
        id: string(r, "id"),
        name: string(r, "name"),
        customers: number(r, "customers"),
        annualSpend: number(r, "annualSpend"),
        serviceableFraction: number(r, "serviceableFraction"),
        obtainableFraction: number(r, "obtainableFraction"),
        annualGrowth: number(r, "annualGrowth"),
        competitors: number(r, "competitors"),
      }),
    ),
    assets: records(row.assets, (r) => {
      const stage = oneOf(r, "stage", STAGES),
        history = strings(r.history);
      if (
        JSON.stringify(history) !==
        JSON.stringify(STAGES.slice(0, STAGES.indexOf(stage) + 1))
      )
        throw new Error("Invalid asset stage history.");
      const asset: Asset = {
        ...createAsset(
          string(r, "id"),
          string(r, "title"),
          string(r, "owner"),
          string(r, "category"),
          string(r, "marketId"),
        ),
        stage,
        history: STAGES.slice(0, STAGES.indexOf(stage) + 1),
        status: oneOf(r, "status", ["active", "paused"]),
        revenueState: oneOf(r, "revenueState", ["none", "eligible", "earning"]),
        annualRevenue: finite(number(r, "annualRevenue"), "Revenue"),
      };
      const canEarn = stage === "revenue" || stage === "expansion";
      if (
        (!canEarn &&
          (asset.annualRevenue !== 0 || asset.revenueState !== "none")) ||
        (canEarn &&
          asset.revenueState !==
            (asset.annualRevenue > 0 ? "earning" : "eligible"))
      )
        throw new Error("Inconsistent revenue state.");
      return asset;
    }),
    initiatives: records(row.initiatives, (r) => {
      const domain: PMDDomain = oneOf(r, "domain", PMD_DOMAINS);
      return PMD_ASSESSORS[domain]({
        id: string(r, "id"),
        title: string(r, "title"),
        owner: string(r, "owner"),
        status: oneOf(r, "status", [
          "planned",
          "active",
          "blocked",
          "complete",
        ]),
        priority: oneOf(r, "priority", ["high", "normal", "low"]),
        stage: oneOf(r, "stage", ["discovery", "pilot", "delivery"]),
        completedChecks: number(r, "completedChecks"),
        totalChecks: number(r, "totalChecks"),
        matchedGoals: number(r, "matchedGoals"),
        totalGoals: number(r, "totalGoals"),
      });
    }),
    compliance: records(row.compliance, readCompliance),
    // Optional for imports from the initial Alpha schema; historical inputs are never invented.
    auditHistory: records(
      row.auditHistory ?? [],
      (r) => {
        const revision = finite(
          number(r, "revision"),
          "Audit revision",
          1,
          2000,
        );
        if (!Number.isInteger(revision) || r.rulesVersion !== 1)
          throw new Error("Invalid audit revision or rule version.");
        const evaluatedAt = string(r, "evaluatedAt");
        validateEvidence({
          source: "Local rule evaluation",
          observedAt: evaluatedAt,
        });
        return {
          revision,
          evaluatedAt,
          rulesVersion: 1 as const,
          record: readCompliance(object(r.record)),
        };
      },
      2000,
    ),
    missions: records(row.missions, (r) => ({
      ...createMission(
        string(r, "id"),
        string(r, "title"),
        string(r, "owner"),
        oneOf(r, "priority", ["high", "normal", "low"]),
      ),
      status: oneOf(r, "status", ["planned", "active", "complete"]),
    })),
  };
  for (const rows of [
    result.observations,
    result.markets,
    result.assets,
    result.initiatives,
    result.compliance,
    result.missions,
  ]) {
    if (new Set(rows.map((r) => r.id)).size !== rows.length)
      throw new Error("Record IDs must be unique within a collection.");
  }
  for (const asset of result.assets)
    if (!result.markets.some((market) => market.id === asset.marketId))
      throw new Error("Asset references an unknown market.");
  for (const record of result.compliance)
    if (!result.assets.some((asset) => asset.id === record.assetId))
      throw new Error("Compliance record references an unknown asset.");
  const revisions = new Map<string, number>();
  for (const entry of result.auditHistory) {
    const expected = (revisions.get(entry.record.id) ?? 0) + 1;
    if (
      entry.revision !== expected ||
      !result.compliance.some((r) => r.id === entry.record.id) ||
      !result.assets.some((a) => a.id === entry.record.assetId)
    )
      throw new Error(
        "Audit history requires contiguous revisions and valid record/asset references.",
      );
    revisions.set(entry.record.id, expected);
  }
  for (const record of result.compliance) {
    const latest = result.auditHistory
      .filter((entry) => entry.record.id === record.id)
      .at(-1);
    if (latest && JSON.stringify(latest.record) !== JSON.stringify(record))
      throw new Error(
        "Latest audit revision must match current compliance evidence.",
      );
  }
  return result;
}
export function importWorkspace(text: string): PortalWorkspace {
  if (new Blob([text]).size > 2_000_000)
    throw new Error("Workspace imports are limited to 2 MB.");
  return validateWorkspace(JSON.parse(text));
}
export const exportWorkspace = (workspace: PortalWorkspace): string =>
  JSON.stringify(validateWorkspace(workspace), null, 2);
interface PortalStore {
  data: PortalWorkspace;
  error: string;
  recovery: string | null;
  update: (change: (workspace: PortalWorkspace) => PortalWorkspace) => void;
  restore: (text: string) => void;
  replaceSaved: () => void;
}
function readSaved(): {
  data: PortalWorkspace;
  error: string;
  recovery: string | null;
} {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(PORTAL_STORAGE_KEY);
    return {
      data: raw === null ? newWorkspace() : importWorkspace(raw),
      error: "",
      recovery: null,
    };
  } catch {
    return {
      data: newWorkspace(),
      error:
        raw === null
          ? "Browser storage is unavailable. Export your workspace before closing."
          : "Saved Portal data is unreadable. Original data is preserved and automatic saving is paused.",
      recovery: raw,
    };
  }
}
export const usePortal = create<PortalStore>((set, get) => {
  const save = (data: PortalWorkspace, replace = false) => {
    const checked = validateWorkspace(data);
    if (get().recovery !== null && !replace) {
      set({ data: checked });
      return;
    }
    try {
      localStorage.setItem(PORTAL_STORAGE_KEY, exportWorkspace(checked));
      set({ data: checked, error: "", recovery: null });
    } catch {
      set({
        data: checked,
        error:
          "Browser storage is unavailable or full. Export your workspace before closing.",
      });
    }
  };
  return {
    ...readSaved(),
    update: (change) => {
      const before = get().data;
      const next = change(structuredClone(before));
      // Callers cannot rewrite the history through normal workspace edits.
      const auditHistory = structuredClone(before.auditHistory);
      for (const record of next.compliance) {
        const previous = before.compliance.find((r) => r.id === record.id);
        if (JSON.stringify(previous) === JSON.stringify(record)) continue;
        let revision = auditHistory.filter(
          (e) => e.record.id === record.id,
        ).length;
        const append = (entry: ComplianceRecord) =>
          auditHistory.push({
            revision: ++revision,
            evaluatedAt: new Date().toISOString(),
            rulesVersion: 1,
            record: structuredClone(entry),
          });
        if (previous && revision === 0) append(previous);
        append(record);
      }
      save({ ...next, auditHistory });
    },
    restore: (text) => save(importWorkspace(text)),
    replaceSaved: () => save(get().data, true),
  };
});
/** Use a stable observation timestamp supplied by the user for every sourced record. */
export function sourceFields(source: string, observedAt: string) {
  const fields = {
    source: requireText(source, "Source"),
    observedAt: new Date(observedAt).toISOString(),
  };
  validateEvidence(fields);
  return fields;
}
