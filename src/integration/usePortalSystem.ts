import { useSyncExternalStore } from "react";
import { portalSystem, type PortalSystem } from "./system";
export function usePortalSystem(system: PortalSystem = portalSystem) {
  return useSyncExternalStore(system.subscribe, system.getSnapshot);
}
