import { describe, expect, it } from "vitest";
import { formatReviewDate } from "../review-date";

const NOW = "2026-10-22T09:00:00Z";

describe("formatReviewDate", () => {
  it("counts UK calendar days, then weeks, then shows the date", () => {
    expect(formatReviewDate("2026-10-22T07:00:00Z", NOW)).toBe("Today");
    expect(formatReviewDate("2026-10-21T23:30:00Z", NOW)).toBe("Today");
    expect(formatReviewDate("2026-10-21T10:00:00Z", NOW)).toBe("1 day ago");
    expect(formatReviewDate("2026-10-16T10:00:00Z", NOW)).toBe("6 days ago");
    expect(formatReviewDate("2026-10-15T10:00:00Z", NOW)).toBe("A week ago");
    expect(formatReviewDate("2026-10-08T10:00:00Z", NOW)).toBe("2 weeks ago");
    expect(formatReviewDate("2026-10-01T10:00:00Z", NOW)).toBe("1 Oct 2026");
  });
});
