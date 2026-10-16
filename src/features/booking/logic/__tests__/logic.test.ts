import { describe, expect, it } from "vitest";
import { getClosedLine, getWhenLine } from "../calendar";
import { getPreviewIndex, hasPreview, PREVIEW_POOL } from "../content";
import { getAddressCheck, getContactChanges, getEmailFix } from "../details";
import { getDeltaLabel } from "../pricing";

describe("details", () => {
  it("suggests the fixed email domain", () => {
    expect(getEmailFix("nia.okafor@gmial.com")).toBe("nia.okafor@gmail.com");
    expect(getEmailFix("nia.okafor@gmail.com")).toBe("");
  });

  it("lists only the contact fields that differ from the profile", () => {
    const profile = { first: "Nia", last: "Okafor", mobile: "07700 900123" };

    const details = {
      ...profile,
      email: "nia@gmail.com",
      phone: "",
      notes: "",
    };

    expect(
      getContactChanges({ ...details, phone: "07700 900123" }, profile),
    ).toEqual({});

    expect(
      getContactChanges(
        { ...details, first: " Nia ", phone: "07700 900456" },
        profile,
      ),
    ).toEqual({ mobile: "07700 900456" });

    expect(
      getContactChanges(
        { ...details, phone: "07700 900123" },
        { ...profile, mobile: "" },
      ),
    ).toEqual({ mobile: "07700 900123" });
  });

  it("suggests the fixed ending, alone or with the domain", () => {
    expect(getEmailFix("kemi@example.comss")).toBe("kemi@example.com");
    expect(getEmailFix("kemi@example.con")).toBe("kemi@example.com");
    expect(getEmailFix("kemi@gmial.coms")).toBe("kemi@gmail.com");
    expect(getEmailFix("kemi@example.co.ukk")).toBe("kemi@example.co.uk");
    expect(getEmailFix("kemi@example.community")).toBe("");
    expect(getEmailFix("kemi@example.co.uk")).toBe("");
  });

  it("labels the postcode and joins the address for a mobile stylist", () => {
    expect(
      getAddressCheck({
        line1: "12 Chorley New Road",
        line2: "",
        town: "Bolton",
        postcode: "bl14qr",
        notes: "",
        source: "pick",
        lat: null,
        lng: null,
      }),
    ).toEqual({
      postcodeLabel: "BL1 4QR",
      isValid: true,
      clientAddress: "12 Chorley New Road, Bolton BL1 4QR",
    });
  });
});

describe("labels", () => {
  it("formats option deltas with a real minus sign", () => {
    expect(getDeltaLabel({ priceDelta: 10, minutesDelta: 30 })).toBe("+£10");

    expect(getDeltaLabel({ priceDelta: -5, minutesDelta: -30 }, true)).toBe(
      "−£5 −30m",
    );
  });

  it("names the closed weekdays and the chosen time", () => {
    const hours = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
      stylist_id: "stylist",
      weekday,
      is_open: weekday !== 0 && weekday !== 6,
      start_time: "10:00:00",
      end_time: "18:00:00",
    }));

    expect(getClosedLine(hours)).toMatch(/^( Closed .+\.)?$/);

    expect(getWhenLine(2026, 9, null, null)).toBe("Not chosen yet");
    expect(getWhenLine(2026, 9, 14, "10:30")).toBe("Wed 14 Oct · 10:30");
  });

  it("picks the knotless render for length and colour", () => {
    const index = getPreviewIndex("Waist", "613 Blonde");

    expect(PREVIEW_POOL[index]).toBe("ai-preview/ai-knotless-waist-613.webp");

    expect(PREVIEW_POOL[getPreviewIndex("Bra", "Other")]).toBe(
      "ai-preview/ai-knotless-bra-1b.webp",
    );

    expect(hasPreview(["Shoulder", "Waist"])).toBe(false);
  });
});
