import { decision, type ComplianceRecord } from "./contracts";
export function checkLicensing(record: ComplianceRecord) {
  return decision(
    record,
    "licensing.record",
    record.license.trim()
      ? []
      : ["Record license terms or the relevant license identifier."],
  );
}
