import { validateObservation, type Observation } from "../portal/contracts";
export interface IndicatorDefinition {
  domain: string;
  metric: string;
  unit: string;
  label: string;
}
/** Use the latest observation per domain/metric/unit; never sum incompatible units or dates. */
export function latestIndicator(
  definition: IndicatorDefinition,
  evidence: Observation[],
) {
  const rows = evidence
    .map(validateObservation)
    .filter(
      (row) =>
        row.domain === definition.domain &&
        row.metric === definition.metric &&
        row.unit === definition.unit,
    )
    .sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt));
  return { ...definition, observation: rows[0] ?? null, samples: rows.length };
}
