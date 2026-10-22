import { describe, expect, it } from "vitest";
import { renderEmail } from "../templates";

const booking = {
  ref: "TH-ABC123",
  service_name: "Silk press",
  stylist_name: "Tiwára's House",
  starts_at: "2026-10-20T09:00:00Z",
  client_name: "Ada Lovelace",
  client_first: "Ada",
};

describe("review emails", () => {
  it("invites the client with the review link and when it stops working", () => {
    const { subject, text } = renderEmail("review_invite", {
      ...booking,
      expires_at: "2026-11-19T12:00:00Z",
      review_url: "https://dev.tiwarashouse.com/review?token=abc",
    });

    expect(subject).toBe("How was your visit to Tiwára's House?");
    expect(text).toContain("https://dev.tiwarashouse.com/review?token=abc");
    expect(text).toContain("This link works until 19 November.");
  });

  it("says the reminder is the last one", () => {
    const { subject, text } = renderEmail("review_reminder", {
      ...booking,
      expires_at: "2026-11-19T12:00:00Z",
      review_url: "https://dev.tiwarashouse.com/review?token=abc",
    });

    expect(subject).toBe("There’s still time to review Tiwára's House");
    expect(text).toContain("This is the only reminder we’ll send.");
  });

  it("tells the stylist the rating and the words", () => {
    const { subject, text } = renderEmail("review_received", {
      ...booking,
      rating: 1,
      body: "Late start",
      studio_url: "https://dev.tiwarashouse.com/studio",
    });

    expect(subject).toBe("New review: 1 out of 5 star");
    expect(text).toContain("“Late start”");
  });
});
