import { assessInitiative, type Initiative } from "./contracts";
export const assessQuantum = (
  input: Omit<Initiative, "domain" | "readinessScore" | "alignmentScore">,
): Initiative => assessInitiative("quantum", input);
