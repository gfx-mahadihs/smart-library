import { describe, expect, it } from "vitest";
import {
  calculateFine,
  canRenewLoan,
  orderedWaitlistPositions,
  recommendationFallback,
  validateReviewRating,
} from "@/lib/library-rules";
import { t, type Locale } from "@/lib/i18n";

describe("library upgrade rules", () => {
  it("renewal requires active, non-overdue loan and available renewal count", () => {
    expect(
      canRenewLoan({
        overdue: false,
        returned: false,
        renewalCount: 1,
        maxRenewals: 2,
        pendingReservationByOther: false,
      }),
    ).toBe(true);
    expect(
      canRenewLoan({
        overdue: true,
        returned: false,
        renewalCount: 1,
        maxRenewals: 2,
        pendingReservationByOther: false,
      }),
    ).toBe(false);
    expect(
      canRenewLoan({
        overdue: false,
        returned: false,
        renewalCount: 2,
        maxRenewals: 2,
        pendingReservationByOther: false,
      }),
    ).toBe(false);
  });

  it("caps fines at the per-loan maximum", () => {
    expect(calculateFine(20, 2, 25)).toBe(25);
    expect(calculateFine(3, 2, 25)).toBe(6);
  });

  it("rebuilds waitlist positions in waiting order", () => {
    expect(
      orderedWaitlistPositions([
        { id: "a", status: "cancelled" },
        { id: "b", status: "waiting" },
        { id: "c", status: "waiting" },
      ]),
    ).toEqual([
      { id: "b", position: 1 },
      { id: "c", position: 2 },
    ]);
  });

  it("validates review ratings and recommendation fallback", () => {
    expect(validateReviewRating(5)).toBe(true);
    expect(validateReviewRating(6)).toBe(false);
    expect(recommendationFallback(["a"], ["a", "b", "c"], 3)).toEqual(["a", "b", "c"]);
  });

  it("provides Bengali and English i18n fallback", () => {
    expect(t("home", "bn")).toBe("হোম");
    expect(t("home", "zz" as Locale)).toBe("Home");
  });
});
