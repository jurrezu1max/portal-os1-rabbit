import { decision, type ComplianceRecord } from "./contracts";
export function checkPrivacy(record: ComplianceRecord) {
  const reasons = [];
  if (record.personalData && !record.lawfulBasis.trim())
    reasons.push("Document a lawful basis for personal data.");
  if (
    record.personalData &&
    (record.retentionDays === null ||
      !Number.isInteger(record.retentionDays) ||
      record.retentionDays <= 0)
  )
    reasons.push("Set a positive retention period in days.");
  return decision(record, "privacy.basis-retention", reasons);
}
