import { decision, type ComplianceRecord } from "./contracts";
export function checkGovernance(record: ComplianceRecord) {
  return decision(
    record,
    "governance.review",
    record.reviewer.trim() && record.approved
      ? []
      : ["A named reviewer must record approval."],
  );
}
