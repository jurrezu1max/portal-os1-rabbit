/** Evidence travels with every observation. Values are user supplied, not verified facts. */
export interface Evidence {
  source: string;
  observedAt: string;
}
export interface Observation extends Evidence {
  id: string;
  domain: string;
  metric: string;
  value: number;
  unit: string;
}
export function requireText(value: string, label: string): string {
  const text = value.trim();
  if (!text || text.length > 200)
    throw new Error(`${label} requires 1–200 characters.`);
  return text;
}
export function finite(
  value: number,
  label: string,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
): number {
  if (!Number.isFinite(value) || value < min || value > max)
    throw new Error(`${label} must be between ${min} and ${max}.`);
  return value;
}
export function validateEvidence(evidence: Evidence): void {
  requireText(evidence.source, "Source");
  if (
    !/^\d{4}-\d{2}-\d{2}T/.test(evidence.observedAt) ||
    !Number.isFinite(Date.parse(evidence.observedAt))
  )
    throw new Error("Observation time must be an ISO timestamp.");
}
export function validateObservation(row: Observation): Observation {
  requireText(row.id, "Observation ID");
  requireText(row.domain, "Domain");
  requireText(row.metric, "Metric");
  requireText(row.unit, "Unit");
  finite(row.value, "Observation value", -Number.MAX_SAFE_INTEGER);
  validateEvidence(row);
  return { ...row };
}
