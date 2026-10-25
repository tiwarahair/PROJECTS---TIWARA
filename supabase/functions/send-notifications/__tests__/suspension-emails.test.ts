import { describe, expect, it } from "vitest";
import { renderEmail } from "../templates";

const suspension = {
  first_name: "Joy",
  business_name: "Plaits & Petals",
  reason: "Same phone number as another account.",
  studio_url: "https://www.tiwarashouse.com/studio",
};

describe("suspension emails", () => {
  it("tells the stylist why, and that existing bookings carry on", () => {
    const { subject, text } = renderEmail("stylist_suspended", suspension);

    expect(subject).toBe("Plaits & Petals is suspended");
    expect(text).toContain("Same phone number as another account.");
    expect(text).toContain("Bookings you already have carry on");
  });

  it("tells the stylist the suspension is lifted", () => {
    const { subject, text } = renderEmail("stylist_unsuspended", suspension);

    expect(subject).toBe("Plaits & Petals is no longer suspended");
    expect(text).not.toContain("Same phone number");
  });
});
