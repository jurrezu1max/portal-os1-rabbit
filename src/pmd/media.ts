import { assessInitiative, type Initiative } from "./contracts";
export const assessMedia = (
  input: Omit<Initiative, "domain" | "readinessScore" | "alignmentScore">,
): Initiative => assessInitiative("media", input);
