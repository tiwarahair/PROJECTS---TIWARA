import { describe, expect, it } from "vitest";
import { getCalendarFile, getGoogleCalendarUrl } from "../calendar-file";

const event = {
  ref: "TH-ABC123",
  title: "Silk press with Tiwára's House",
  startsAt: "2026-10-20T09:30:00Z",
  endsAt: "2026-10-20T11:30:00Z",
  location: "12 Dickenson Road, Manchester, M14 5TQ",
  description: `Booking TH-ABC123. Manage it from your confirmation email; ${"long ".repeat(20)}`,
};

describe("the calendar file", () => {
  const file = getCalendarFile(event);
  const lines = file.split("\r\n");

  it("is an add-to-calendar event in UTC with CRLF lines", () => {
    expect(file.endsWith("\r\n")).toBe(true);
    expect(file).not.toMatch(/[^\r]\n/);
    expect(lines).toContain("METHOD:PUBLISH");
    expect(lines).toContain("UID:TH-ABC123@tiwarashouse.com");
    expect(lines).toContain("DTSTART:20261020T093000Z");
    expect(lines).toContain("DTEND:20261020T113000Z");
  });

  it("escapes commas and semicolons in text", () => {
    const unfolded = file.replace(/\r\n /g, "");

    expect(unfolded).toContain(
      "LOCATION:12 Dickenson Road\\, Manchester\\, M14 5TQ",
    );

    expect(unfolded).toContain("email\\; long");
  });

  it("folds lines at 75 octets, multi-byte letters included", () => {
    const encoder = new TextEncoder();

    for (const line of lines)
      expect(encoder.encode(line).length).toBeLessThanOrEqual(75);

    expect(file.replace(/\r\n /g, "")).toContain(
      "SUMMARY:Silk press with Tiwára's House",
    );
  });
});

describe("the Google Calendar link", () => {
  it("prefills the title, times and place", () => {
    const url = new URL(getGoogleCalendarUrl(event));

    expect(url.searchParams.get("action")).toBe("TEMPLATE");
    expect(url.searchParams.get("text")).toBe(event.title);

    expect(url.searchParams.get("dates")).toBe(
      "20261020T093000Z/20261020T113000Z",
    );

    expect(url.searchParams.get("location")).toBe(event.location);
  });
});

describe("calendar text", () => {
  it("escapes backslashes and new lines", () => {
    const file = getCalendarFile({
      ...event,
      description: "Bring a scarf\\wrap\nand a towel",
    });

    expect(file.replace(/\r\n /g, "")).toContain(
      "DESCRIPTION:Bring a scarf\\\\wrap\\nand a towel",
    );
  });
});
