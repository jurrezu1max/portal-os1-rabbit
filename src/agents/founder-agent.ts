import { prioritize } from "../mission/planning";
import { recommendation, type AgentInput } from "./contracts";
export function founderAgent(input: AgentInput) {
  const open = prioritize(input.missions).filter(
    (m) => m.status !== "complete",
  );
  return recommendation(
    [
      `${open.length} open actions. Priority order: high, normal, low; completed actions excluded.`,
    ],
    open.length
      ? open.map((m) => `${m.owner}: ${m.title}`)
      : ["Record the next owned mission action."],
    open.length ? 1 : 0,
    1,
  );
}
