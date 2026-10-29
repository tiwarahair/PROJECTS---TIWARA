import { describe, expect, it } from "vitest";
import type { AdminReport } from "../../../../lib/admin-api";
import {
  getAgeText,
  getDefaultSort,
  getDueText,
  getReporter,
  isOverdue,
} from "../view";

const NOW = new Date("2026-10-22T12:00:00Z");

const report = (patch: Partial<AdminReport>) =>
  ({
    sort_at: "2026-10-22T06:00:00Z",
    due_at: null,
    ...patch,
  }) as AdminReport;

describe("reports view", () => {
  it("says how long ago a report came in", () => {
    expect(getAgeText(report({}), "open", NOW)).toBe("Reported 6 hours ago");

    expect(
      getAgeText(report({ sort_at: "2026-10-14T12:00:00Z" }), "appealed", NOW),
    ).toBe("Appealed a week ago");

    expect(
      getAgeText(report({ sort_at: "2026-09-01T12:00:00Z" }), "decided", NOW),
    ).toBe("Decided on 1 Sept 2026");
  });

  it("gives the due time for the tooltip", () => {
    const late = report({ due_at: "2026-10-21T08:12:00Z" });

    expect(isOverdue(late, NOW)).toBe(true);
    expect(getDueText(late, NOW)).toBe("Was due 21 Oct, 09:12");

    expect(getDueText(report({ due_at: "2026-10-23T06:00:00Z" }), NOW)).toBe(
      "Due in 18 hours",
    );

    expect(getDueText(report({ due_at: "2026-10-27T09:00:00Z" }), NOW)).toBe(
      "Due Tue 27 Oct",
    );
  });

  it("names who reported it", () => {
    const reporter = { reporter_name: null, reporter_deleted: false };

    expect(getReporter({ ...reporter, is_stylist: true })).toBe("the stylist");

    expect(
      getReporter({ ...reporter, is_stylist: false, reporter_name: "Joy Eze" }),
    ).toBe("a client, Joy Eze");

    expect(
      getReporter({ ...reporter, is_stylist: false, reporter_deleted: true }),
    ).toBe("a client who has since deleted their account");
  });

  it("reads decided reviews newest first", () => {
    expect(getDefaultSort("decided")).toBe("newest");
    expect(getDefaultSort("open")).toBe("oldest");
  });
});
