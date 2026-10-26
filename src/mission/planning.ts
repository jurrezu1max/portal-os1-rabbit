import { requireText } from "../portal/contracts";
export interface MissionAction {
  id: string;
  title: string;
  owner: string;
  status: "planned" | "active" | "complete";
  priority: "high" | "normal" | "low";
}
export function createMission(
  id: string,
  title: string,
  owner: string,
  priority: MissionAction["priority"],
): MissionAction {
  if (!["high", "normal", "low"].includes(priority))
    throw new Error("Invalid mission priority.");
  return {
    id: requireText(id, "Mission ID"),
    title: requireText(title, "Action"),
    owner: requireText(owner, "Owner"),
    status: "planned",
    priority,
  };
}
export function prioritize(actions: MissionAction[]): MissionAction[] {
  const rank = { high: 0, normal: 1, low: 2 };
  return [...actions].sort(
    (a, b) =>
      Number(a.status === "complete") - Number(b.status === "complete") ||
      rank[a.priority] - rank[b.priority] ||
      a.id.localeCompare(b.id),
  );
}
