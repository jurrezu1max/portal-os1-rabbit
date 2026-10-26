import { validateRoles } from "./roles";

export interface Identity {
  id: string;
  type: "human" | "agent" | "organization";
  name: string;
  roles: string[];
  capabilities: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Capability {
  id: string;
  name: string;
  category: string;
  proficiency: number;
}

export type IdentityInput = Pick<Identity, "type" | "name"> &
  Partial<Pick<Identity, "id" | "roles" | "capabilities">>;
export type IdentityUpdate = Partial<
  Pick<Identity, "type" | "name" | "roles" | "capabilities">
>;

export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Expected an identity registry record.");
  return value as Record<string, unknown>;
}

export function text(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || value.length > 200)
    throw new Error("Text must contain 1–200 characters.");
  return value.trim();
}

export function identifiers(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 200)
    throw new Error("Expected a list of up to 200 identifiers.");
  const ids = value.map(text);
  if (new Set(ids).size !== ids.length)
    throw new Error("Duplicate identifiers are not allowed.");
  return ids;
}

export function validateIdentity(value: unknown): Identity {
  const row = record(value);
  if (!["human", "agent", "organization"].includes(row.type as string))
    throw new Error("Unknown identity type.");
  const createdAt = text(row.createdAt);
  const updatedAt = text(row.updatedAt);
  for (const date of [createdAt, updatedAt]) {
    if (
      !Number.isFinite(Date.parse(date)) ||
      new Date(date).toISOString() !== date
    )
      throw new Error("Identity timestamps must be canonical ISO dates.");
  }
  if (updatedAt < createdAt)
    throw new Error("Identity update cannot precede creation.");
  return {
    id: text(row.id),
    type: row.type as Identity["type"],
    name: text(row.name),
    roles: validateRoles(identifiers(row.roles)),
    capabilities: identifiers(row.capabilities),
    createdAt,
    updatedAt,
  };
}
