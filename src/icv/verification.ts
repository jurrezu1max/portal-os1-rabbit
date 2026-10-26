import { validateObservation, type Observation } from "../portal/contracts";
export interface Verification {
  valid: boolean;
  issues: string[];
  verifiedFacts: number;
}
export function verifyEvidence(rows: Observation[]): Verification {
  const issues: string[] = [];
  const ids = new Set<string>();
  for (const row of rows) {
    try {
      validateObservation(row);
      if (ids.has(row.id)) issues.push(`Duplicate observation: ${row.id}`);
      ids.add(row.id);
    } catch (error) {
      issues.push(
        error instanceof Error ? error.message : "Invalid observation.",
      );
    }
  }
  return { valid: issues.length === 0, issues, verifiedFacts: 0 };
}
