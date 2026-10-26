import { toCents } from "./revenue";
/** Planning preview only. No royalty obligations or payouts are recorded. */
export function calculateRoyalty(amount: number, percentage: number): number {
  if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100)
    throw new Error("Royalty percentage must be 0–100.");
  return Math.round((toCents(amount) * percentage) / 100) / 100;
}
