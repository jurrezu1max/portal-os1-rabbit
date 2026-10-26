import { assessInitiative, type Initiative } from "./contracts";
export const assessClimate = (
  input: Omit<Initiative, "domain" | "readinessScore" | "alignmentScore">,
): Initiative => assessInitiative("climate", input);
