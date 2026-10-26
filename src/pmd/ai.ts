import { assessInitiative, type Initiative } from "./contracts";
export const assessAi = (
  input: Omit<Initiative, "domain" | "readinessScore" | "alignmentScore">,
): Initiative => assessInitiative("ai", input);
