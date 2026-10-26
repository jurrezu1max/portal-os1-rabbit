import {
  requireText,
  validateEvidence,
  type Evidence,
} from "../portal/contracts";
export interface ComplianceRecord extends Evidence {
  id: string;
  assetId: string;
  owner: string;
  copyright: string;
  trademark: string;
  license: string;
  personalData: boolean;
  lawfulBasis: string;
  retentionDays: number | null;
  reviewer: string;
  approved: boolean;
  likelihood: number | null;
  impact: number | null;
}
export interface AuditDecision {
  rule: string;
  version: 1;
  status: "pass" | "review";
  reasons: string[];
  source: string;
  observedAt: string;
  recordId: string;
}
export function decision(
  record: ComplianceRecord,
  rule: string,
  reasons: string[],
): AuditDecision {
  requireText(record.id, "Record ID");
  requireText(record.assetId, "Asset ID");
  validateEvidence(record);
  return {
    rule,
    version: 1,
    status: reasons.length ? "review" : "pass",
    reasons: reasons.length
      ? reasons
      : [
          "Recorded requirements are present. Human verification remains required.",
        ],
    source: record.source,
    observedAt: record.observedAt,
    recordId: record.id,
  };
}

/** Historical evidence snapshots retain the inputs needed to reproduce each rule decision. */
export interface AuditRevision {
  revision: number;
  evaluatedAt: string;
  rulesVersion: 1;
  record: ComplianceRecord;
}
