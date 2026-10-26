import { object, text, timestamp, type License } from "./types";
/** Licenses are recorded grants; the schema has no expiration/revocation field. */
export function validateLicense(value: unknown): License {
  const row = object(value);
  return {
    id: text(row.id),
    assetId: text(row.assetId),
    holder: text(row.holder),
    type: text(row.type),
    issuedAt: timestamp(row.issuedAt),
  };
}
