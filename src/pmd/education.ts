import { assessInitiative, type Initiative } from "./contracts";
export const assessEducation = (
  input: Omit<Initiative, "domain" | "readinessScore" | "alignmentScore">,
): Initiative => assessInitiative("education", input);
