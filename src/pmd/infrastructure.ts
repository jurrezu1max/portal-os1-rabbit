import { assessInitiative, type Initiative } from "./contracts";
export const assessInfrastructure = (
  input: Omit<Initiative, "domain" | "readinessScore" | "alignmentScore">,
): Initiative => assessInitiative("infrastructure", input);
