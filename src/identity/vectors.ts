import type { Capability, Identity } from "./types";

/** Stable, explicit capability axes; values are catalog proficiency / 100. */
export function capabilityVector(
  identity: Identity,
  catalog: readonly Capability[],
) {
  const ordered = [...catalog].sort((a, b) => a.id.localeCompare(b.id));
  return {
    identityId: identity.id,
    dimensions: ordered.map((capability) => capability.id),
    values: ordered.map((capability) =>
      identity.capabilities.includes(capability.id)
        ? capability.proficiency / 100
        : 0,
    ),
  };
}
