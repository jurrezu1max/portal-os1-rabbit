import { requireText } from "../portal/contracts";
import type { Profile } from "./identity";
export interface Context {
  sessionId: string;
  workspace: string;
  project: string;
  goals: string[];
  profile: Profile;
}
export function createContext(
  sessionId: string,
  workspace: string,
  project: string,
  goals: string[],
  profile: Profile,
): Context {
  return {
    sessionId: requireText(sessionId, "Session"),
    workspace: requireText(workspace, "Workspace"),
    project: requireText(project, "Project"),
    goals: goals.map((g) => requireText(g, "Goal")),
    profile,
  };
}
