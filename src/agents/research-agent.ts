import { verifyEvidence } from "../icv/verification";
import { recommendation, type AgentInput } from "./contracts";
export function researchAgent(input: AgentInput) {
  const verification = verifyEvidence(input.evidence);
  return recommendation(
    [
      `${input.evidence.length} observations; source metadata checked.`,
      ...verification.issues,
      "No external fact verification has been performed.",
    ],
    verification.valid && input.evidence.length
      ? ["Compare independent sources before promoting an observation."]
      : ["Collect valid sourced observations."],
    verification.valid && input.evidence.length ? 1 : 0,
    1,
  );
}
