import { assessInitiative, type Initiative } from "./contracts";
export const assessSocial = (
  input: Omit<Initiative, "domain" | "readinessScore" | "alignmentScore">,
): Initiative => assessInitiative("social", input);
