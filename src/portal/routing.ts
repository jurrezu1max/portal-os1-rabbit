import { isDashboard, type DashboardId } from "./navigation";
export function resolveRoute(hash: string): DashboardId | null {
  const id = hash.replace(/^#\/?portal\//, "");
  return isDashboard(id) ? id : null;
}
export const routeFor = (id: DashboardId): string => `#/portal/${id}`;
