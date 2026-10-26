import { decision } from "../compliance/contracts";
import type { Identity } from "../identity/types";
import { auditCompliance } from "../compliance/audit";
import type { AuditRevision, ComplianceRecord } from "../compliance/contracts";
import type { GSIPAsset } from "../gsip/registry/types";
import {
  validateComplianceRecord,
  type PortalWorkspace,
} from "../portal/workspace";
import type { ComplianceState } from "./types";
export function systemCompliance(
  assets: readonly GSIPAsset[],
  records: ComplianceRecord[],
  workspace: PortalWorkspace,
  identities: readonly Identity[],
): ComplianceState {
  const decisions = [
    ...records.flatMap((record) =>
      [
        ...auditCompliance(record),
        decision(
          record,
          "registry-ownership",
          (() => {
            const asset = assets.find((asset) => asset.id === record.assetId);
            const owner = identities.find(
              (identity) => identity.id === asset?.ownerId,
            );
            return !asset
              ? ["Registry asset is missing."]
              : !owner
                ? ["Registered owner is missing."]
                : record.owner !== owner.name && record.owner !== owner.id
                  ? [
                      "Ownership evidence does not match the current registered owner.",
                    ]
                  : [];
          })(),
        ),
      ].map((decision) => ({
        ...decision,
        scope: "registry" as const,
      })),
    ),
    ...workspace.compliance.flatMap((record) =>
      auditCompliance(record).map((decision) => ({
        ...decision,
        scope: "factory" as const,
      })),
    ),
  ];
  const unreviewedAssets = [
    ...assets
      .filter((asset) => !records.some((record) => record.assetId === asset.id))
      .map((asset) => `Registry: ${asset.title}`),
    ...workspace.assets
      .filter(
        (asset) =>
          !workspace.compliance.some((record) => record.assetId === asset.id),
      )
      .map((asset) => `Factory: ${asset.title}`),
  ];
  const reviewCount = decisions.filter(
    (decision) => decision.status === "review",
  ).length;
  return {
    records: structuredClone(records),
    decisions,
    unreviewedAssets,
    reviewCount,
    status: !decisions.length
      ? "unreviewed"
      : reviewCount || unreviewedAssets.length
        ? "review"
        : "pass",
  };
}
/** Every revision retains its original rule inputs; ordinary edits cannot rewrite history. */
export function reviseCompliance(
  records: ComplianceRecord[],
  previous: ComplianceRecord[],
  history: AuditRevision[],
  assetIds: string[],
  now: string,
) {
  const checked = records.map(validateComplianceRecord);
  if (new Set(checked.map((record) => record.id)).size !== checked.length)
    throw new Error("Duplicate compliance record IDs.");
  if (previous.some((record) => !checked.some((item) => item.id === record.id)))
    throw new Error("Compliance history cannot be deleted.");
  const revisions = structuredClone(history);
  for (const record of checked) {
    if (!assetIds.includes(record.assetId))
      throw new Error("Compliance asset not found.");
    const old = previous.find((item) => item.id === record.id);
    if (old && old.assetId !== record.assetId)
      throw new Error("An audit record cannot be reassigned to another asset.");
    if (JSON.stringify(record) !== JSON.stringify(old))
      revisions.push({
        revision:
          revisions.filter((entry) => entry.record.id === record.id).length + 1,
        evaluatedAt: now,
        rulesVersion: 1,
        record,
      });
  }
  return { compliance: checked, auditHistory: revisions };
}
