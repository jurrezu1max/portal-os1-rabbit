import type { Identity } from "../../identity/types";
import { object, text, timestamp, type OwnershipRecord } from "./types";
export function requireOwner(
  ownerId: string,
  findIdentity: (id: string) => Identity | undefined,
): string {
  const id = text(ownerId);
  if (!findIdentity(id))
    throw new Error("Choose an owner from the Identity Registry.");
  return id;
}
export function validateOwnership(value: unknown): OwnershipRecord {
  const row = object(value);
  return {
    id: text(row.id),
    assetId: text(row.assetId),
    fromOwnerId: row.fromOwnerId === null ? null : text(row.fromOwnerId),
    toOwnerId: text(row.toOwnerId),
    timestamp: timestamp(row.timestamp),
  };
}
