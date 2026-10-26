import { finite, requireText } from "../portal/contracts";
export const PMD_DOMAINS = [
  "ai",
  "education",
  "social",
  "media",
  "urban",
  "climate",
  "infrastructure",
  "quantum",
] as const;
export type PMDDomain = (typeof PMD_DOMAINS)[number];
export interface Initiative {
  id: string;
  title: string;
  domain: PMDDomain;
  status: "planned" | "active" | "blocked" | "complete";
  priority: "high" | "normal" | "low";
  readinessScore: number;
  alignmentScore: number;
  stage: "discovery" | "pilot" | "delivery";
  owner: string;
  completedChecks: number;
  totalChecks: number;
  matchedGoals: number;
  totalGoals: number;
}
export function assessInitiative(
  domain: PMDDomain,
  input: Omit<Initiative, "domain" | "readinessScore" | "alignmentScore">,
): Initiative {
  requireText(input.id, "Initiative ID");
  requireText(input.title, "Initiative title");
  requireText(input.owner, "Owner");
  finite(input.totalChecks, "Readiness checks", 1);
  finite(input.completedChecks, "Completed checks", 0, input.totalChecks);
  finite(input.totalGoals, "Goals", 1);
  finite(input.matchedGoals, "Matched goals", 0, input.totalGoals);
  if (
    ![
      input.totalChecks,
      input.completedChecks,
      input.totalGoals,
      input.matchedGoals,
    ].every(Number.isInteger)
  )
    throw new Error("Checks and goals must be integer counts.");
  if (
    !["planned", "active", "blocked", "complete"].includes(input.status) ||
    !["high", "normal", "low"].includes(input.priority) ||
    !["discovery", "pilot", "delivery"].includes(input.stage)
  )
    throw new Error("Invalid initiative state.");
  return {
    ...input,
    domain,
    readinessScore: (input.completedChecks / input.totalChecks) * 100,
    alignmentScore: (input.matchedGoals / input.totalGoals) * 100,
  };
}
