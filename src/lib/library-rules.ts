export function canRenewLoan(input: {
  overdue: boolean;
  renewalCount: number;
  maxRenewals: number;
  pendingReservationByOther: boolean;
  returned: boolean;
}) {
  return (
    !input.overdue &&
    !input.returned &&
    !input.pendingReservationByOther &&
    input.renewalCount < input.maxRenewals
  );
}

export function calculateFine(overdueDays: number, ratePerDay: number, capPerLoan: number) {
  if (overdueDays <= 0 || ratePerDay <= 0) return 0;
  return Math.min(overdueDays * ratePerDay, capPerLoan);
}

export function orderedWaitlistPositions(
  entries: Array<{ id: string; status: "waiting" | "notified" | "expired" | "cancelled" }>,
) {
  return entries
    .filter((entry) => entry.status === "waiting")
    .map((entry, index) => ({ id: entry.id, position: index + 1 }));
}

export function validateReviewRating(rating: number) {
  return Number.isInteger(rating) && rating >= 1 && rating <= 5;
}

export function recommendationFallback<T>(ranked: T[], popular: T[], limit: number) {
  const merged = [...ranked];
  for (const item of popular) {
    if (merged.length >= limit) break;
    if (!merged.includes(item)) merged.push(item);
  }
  return merged.slice(0, limit);
}
