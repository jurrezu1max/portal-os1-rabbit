import { checkIP } from "./ip";
import { checkPrivacy } from "./privacy";
import { checkGovernance } from "./governance";
import { checkLicensing } from "./licensing";
import { assessRisk } from "./risk";
import type { ComplianceRecord } from "./contracts";
export function auditCompliance(record: ComplianceRecord) {
  return [
    checkIP(record),
    checkPrivacy(record),
    checkGovernance(record),
    checkLicensing(record),
    assessRisk(record),
  ];
}
