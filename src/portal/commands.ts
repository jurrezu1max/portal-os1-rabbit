import { DASHBOARDS, type DashboardId } from "./navigation";
import { runWorkspaceCommand } from "../engine/assistant";
export type PortalCommand =
  | { kind: "navigate"; page: DashboardId }
  | { kind: "workspace"; prompt: string };
export function routeCommand(input: string): PortalCommand {
  const match = input.trim().match(/^open\s+(.+)$/i);
  if (match) {
    const page = DASHBOARDS.find(
      (d) =>
        d.id === match[1].toLowerCase() ||
        d.title.toLowerCase() === match[1].toLowerCase(),
    );
    if (!page)
      throw new Error("Unknown dashboard. Use its full name or route ID.");
    return { kind: "navigate", page: page.id };
  }
  return { kind: "workspace", prompt: input };
}
export function executePortalCommand(
  input: string,
  navigate: (page: DashboardId) => void,
  selected: string | null,
  onFailure: (seeds: string[]) => void,
): string {
  const command = routeCommand(input);
  if (command.kind === "navigate") {
    navigate(command.page);
    return "Dashboard opened.";
  }
  return runWorkspaceCommand(command.prompt, selected, onFailure);
}
