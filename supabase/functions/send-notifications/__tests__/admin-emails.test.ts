import { describe, expect, it } from "vitest";
import { renderEmail } from "../templates";

const booking = {
  ref: "TH-ABC123",
  service_name: "Knotless braids",
  stylist_name: "Crowned by Kemi",
  starts_at: "2026-10-20T09:00:00Z",
  client_name: "Yasmin Bello",
  client_first: "Yasmin",
  rating: 2,
  reason: "personal_info",
};

describe("moderation emails", () => {
  it("alerts the admins to a hidden review", () => {
    const { subject, text } = renderEmail("admin_report_alert", {
      reason: "threat",
      stylist_name: "Crowned by Kemi",
      rating: 1,
      admin_url: "https://dev.tiwarashouse.com/admin",
    });

    expect(subject).toBe("Hidden review to check: a threat or extortion");
    expect(text).toContain("within 24 hours");
  });

  it("summarises what's waiting", () => {
    const { subject } = renderEmail("admin_report_summary", {
      open: 3,
      overdue: 1,
      appeals: 1,
      admin_url: "https://dev.tiwarashouse.com/admin",
    });

    expect(subject).toBe("3 open reports, 1 overdue");
  });

  it("tells the reviewer what changed and how to appeal", () => {
    const { text } = renderEmail("review_decision_reviewer", {
      ...booking,
      outcome: "text_removed",
      appeal_until: "2026-11-05T12:00:00Z",
      appeal_url: "https://dev.tiwarashouse.com/appeal?token=abc",
    });

    expect(text).toContain("the words were removed");
    expect(text).toContain("until 5 November");
    expect(text).toContain("https://dev.tiwarashouse.com/appeal?token=abc");
  });

  it("only offers the stylist an appeal when they can make one", () => {
    const decision = { ...booking, outcome: "kept", appeal_until: "2026-11-05T12:00:00Z" };

    expect(renderEmail("review_decision_stylist", { ...decision, can_appeal: true }).text).toContain(
      "you can appeal once",
    );

    expect(renderEmail("review_decision_stylist", { ...decision, can_appeal: false }).text).not.toContain("appeal");
  });

  it("says an appeal answer is final", () => {
    const { subject, text } = renderEmail("review_appeal_answered", {
      ...booking,
      outcome: "kept",
      is_changed: true,
      audience: "reviewer",
    });

    expect(subject).toBe("An appeal changed our decision");
    expect(text).toContain("This is final.");
  });
});
