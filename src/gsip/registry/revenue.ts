import { object, text, timestamp, type RevenueRecord } from "./types";
/** Single currency ledger: USD, exact cents; aggregate limited to $1 billion. */
export function toCents(amount: number): number {
  const cents = Math.round(amount * 100);
  if (
    !Number.isFinite(amount) ||
    amount < 0 ||
    amount > 1_000_000_000 ||
    Math.abs(amount * 100 - cents) > 0.00001
  )
    throw new Error(
      "USD amounts must be 0–1 billion with at most two decimals.",
    );
  return cents;
}
export function validateRevenue(value: unknown): RevenueRecord {
  const row = object(value);
  if (typeof row.amount !== "number" || row.amount <= 0)
    throw new Error("Revenue must be a positive USD amount.");
  const amount = toCents(row.amount) / 100;
  return {
    id: text(row.id),
    assetId: text(row.assetId),
    amount,
    source: text(row.source),
    timestamp: timestamp(row.timestamp),
  };
}
export function totalRevenue(records: readonly RevenueRecord[]): number {
  const cents = records.reduce(
    (total, record) => total + toCents(record.amount),
    0,
  );
  return toCents(cents / 100) / 100;
}
