import { decision, type ComplianceRecord } from "./contracts";
export function checkIP(record: ComplianceRecord) {
  const reasons = [];
  if (!record.owner.trim()) reasons.push("Assign an IP owner.");
  if (!record.copyright.trim()) reasons.push("Record copyright provenance.");
  if (!record.trademark.trim())
    reasons.push(
      "Record trademark clearance or a documented not-applicable rationale.",
    );
  return decision(record, "ip.provenance", reasons);
}
