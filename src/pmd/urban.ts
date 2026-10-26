import { assessInitiative, type Initiative } from "./contracts";
export const assessUrban = (
  input: Omit<Initiative, "domain" | "readinessScore" | "alignmentScore">,
): Initiative => assessInitiative("urban", input);
