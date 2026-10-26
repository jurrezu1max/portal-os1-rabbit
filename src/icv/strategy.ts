import type { Context } from "./context";
import { extractMeaning } from "./meaning";
import { assessCoherence } from "./coherence";
import { verifyEvidence } from "./verification";
import type { Observation } from "../portal/contracts";
export function planAction(
  input: string,
  context: Context,
  evidence: Observation[],
) {
  const meaning = extractMeaning(input);
  const coherence = assessCoherence(meaning, context);
  const verification = verifyEvidence(evidence);
  const actions = !input.trim()
    ? []
    : !verification.valid
      ? ["Repair evidence integrity before acting."]
      : coherence.conflicts.length
        ? ["Resolve possible goal conflicts before acting."]
        : evidence.length
          ? [
              `Review ${meaning.classifications.join(", ") || "unclassified"} evidence with ${context.profile.name}.`,
              "Choose an owner and record the next action.",
            ]
          : ["Collect sourced evidence before planning execution."];
  return {
    meaning,
    context,
    coherence,
    verification,
    actions,
    priority:
      coherence.conflicts.length || !verification.valid ? "review" : "normal",
  };
}
