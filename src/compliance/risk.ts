import { decision, type ComplianceRecord } from "./contracts";
export function assessRisk(record: ComplianceRecord) {
  const valid = (n: number | null): n is number =>
    n !== null && Number.isInteger(n) && n >= 1 && n <= 5;
  const score =
    valid(record.likelihood) && valid(record.impact)
      ? record.likelihood * record.impact
      : null;
  return {
    ...decision(
      record,
      "risk.matrix",
      score === null
        ? ["Record likelihood and impact on the 1–5 rubric."]
        : score >= 12
          ? ["Risk score is at least 12/25. Record mitigation before release."]
          : [],
    ),
    score,
  };
}
