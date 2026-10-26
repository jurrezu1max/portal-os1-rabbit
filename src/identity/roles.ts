export const ROLES = [
  "Founder",
  "Admin",
  "Operator",
  "Researcher",
  "Strategist",
  "Observer",
  "MarketAgent",
  "ComplianceAgent",
] as const;
export type Role = (typeof ROLES)[number];

/** Roles are local metadata; they do not grant application permissions. */
export function validateRoles(roles: string[]): Role[] {
  return roles.map((role) => {
    const known = ROLES.find((candidate) => candidate === role);
    if (!known) throw new Error(`Unknown role: ${role}.`);
    return known;
  });
}
