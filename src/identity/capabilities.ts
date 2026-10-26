import { record, text, type Capability } from "./types";

/** Proficiency belongs to the catalog record referenced by Identity.capabilities. */
export function validateCapability(value: unknown): Capability {
  const row = record(value);
  if (
    typeof row.proficiency !== "number" ||
    !Number.isFinite(row.proficiency) ||
    row.proficiency < 0 ||
    row.proficiency > 100
  )
    throw new Error("Capability proficiency must be a number from 0 to 100.");
  return {
    id: text(row.id),
    name: text(row.name),
    category: text(row.category),
    proficiency: row.proficiency,
  };
}
