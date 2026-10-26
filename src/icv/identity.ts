import { requireText } from "../portal/contracts";
export const AGENT_IDS = [
  "founder",
  "research",
  "market",
  "strategy",
  "compliance",
] as const;
export type AgentId = (typeof AGENT_IDS)[number];
export interface Profile {
  id: string;
  name: string;
  role: "founder" | "researcher" | "analyst";
  capabilities: string[];
}
export const AGENT_REGISTRY = AGENT_IDS.map((id) => ({
  id,
  capabilities: [`${id}:recommend`],
}));
export function createProfile(name: string, role: Profile["role"]): Profile {
  if (!["founder", "researcher", "analyst"].includes(role))
    throw new Error("Unknown role.");
  return {
    id: "local-user",
    name: requireText(name, "Profile name"),
    role,
    capabilities: ["workspace:edit", "evidence:record"],
  };
}
