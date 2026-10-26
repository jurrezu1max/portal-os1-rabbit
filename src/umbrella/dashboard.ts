import { POPULATION } from "./population";
import { ECONOMICS } from "./economics";
import { INFRASTRUCTURE } from "./infrastructure";
import { CLIMATE } from "./climate";
import { EDUCATION } from "./education";
import { GOVERNMENT } from "./government";
import { INDUSTRY } from "./industry";
import { latestIndicator, type IndicatorDefinition } from "./analytics";
import type { Observation } from "../portal/contracts";
export const INDICATORS: IndicatorDefinition[] = [
  POPULATION,
  ECONOMICS,
  INFRASTRUCTURE,
  CLIMATE,
  EDUCATION,
  GOVERNMENT,
  INDUSTRY,
  {
    domain: "institutions",
    metric: "institutions",
    unit: "count",
    label: "Institutions",
  },
  {
    domain: "technology",
    metric: "adoption",
    unit: "%",
    label: "Technology adoption",
  },
];
export const planetaryIndicators = (rows: Observation[]) =>
  INDICATORS.map((definition) => latestIndicator(definition, rows));
