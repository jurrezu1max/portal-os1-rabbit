import type { Context } from "./context";
import type { Meaning } from "./meaning";
import { extractMeaning } from "./meaning";
export interface Coherence {
  alignment: number | null;
  conflicts: string[];
  matchedGoals: string[];
  reasoning: string[];
}
export function assessCoherence(meaning: Meaning, context: Context): Coherence {
  const matchedGoals = context.goals.filter((goal) =>
    extractMeaning(goal).tokens.some((token) => meaning.tokens.includes(token)),
  );
  const conflicts = context.goals
    .filter((goal) => {
      const tokens = extractMeaning(goal).tokens;
      const negated = tokens.includes("avoid") || tokens.includes("never");
      return (
        negated &&
        tokens
          .filter((t) => t !== "avoid" && t !== "never")
          .some((t) => meaning.tokens.includes(t))
      );
    })
    .map((goal) => `Possible conflict with goal: ${goal}`);
  return {
    alignment: context.goals.length
      ? (100 * matchedGoals.length) / context.goals.length
      : null,
    conflicts,
    matchedGoals,
    reasoning: [
      "Alignment = percentage of workspace goals with at least one shared token.",
      "Avoid/never goal matches flag possible conflicts for human review. No semantic certainty is claimed.",
    ],
  };
}
