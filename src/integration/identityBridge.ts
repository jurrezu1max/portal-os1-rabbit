import type { Identity } from "../identity/types";
import type { GSIPAsset } from "../gsip/registry/types";
import type { Profile } from "../icv/identity";
/** Preserve the ICV profile contract while using a selected registry identity. */
export function identityProfile(
  identities: readonly Identity[],
  id: string | null,
  fallback: Profile,
): Profile {
  const identity = identities.find((item) => item.id === id);
  if (!identity) return structuredClone(fallback);
  return {
    id: identity.id,
    name: identity.name,
    role: identity.roles.includes("Founder")
      ? "founder"
      : identity.roles.includes("Researcher")
        ? "researcher"
        : "analyst",
    capabilities: [...identity.capabilities],
  };
}
export function identityAssets(
  identityId: string,
  assets: readonly GSIPAsset[],
): GSIPAsset[] {
  return assets
    .filter((asset) => asset.ownerId === identityId)
    .map((asset) => ({ ...asset }));
}
