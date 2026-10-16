import { describe, expect, it } from "vitest";
import { renderEmail } from "../templates";

describe("booking_invite email", () => {
  it("sends the new save-details link", () => {
    const { subject, text } = renderEmail("booking_invite", {
      first: "Nia",
      save_details_url: "https://dev.tiwarashouse.com/save-details?token=abc",
    });

    expect(subject).toBe("Save your details");
    expect(text).toContain("Hi Nia, here’s your new link.");
    expect(text).toContain("https://dev.tiwarashouse.com/save-details?token=abc");
  });
});
