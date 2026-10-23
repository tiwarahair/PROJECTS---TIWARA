import { describe, expect, it } from "vitest";
import { fromLondonTime, toLondonTime } from "../london-time";

describe("UK time", () => {
  it("shows an instant in UK time, summer and winter", () => {
    expect(toLondonTime("2026-10-20T09:30:00Z")).toEqual({
      date: "2026-10-20",
      time: "10:30",
    });

    expect(toLondonTime("2026-11-20T09:30:00Z")).toEqual({
      date: "2026-11-20",
      time: "09:30",
    });

    expect(toLondonTime("2026-10-20T23:30:00Z")).toEqual({
      date: "2026-10-21",
      time: "00:30",
    });
  });

  it("turns a UK date and time back into the instant", () => {
    expect(fromLondonTime("2026-10-20", "10:30")).toBe(
      "2026-10-20T09:30:00.000Z",
    );

    expect(fromLondonTime("2026-11-20", "09:30")).toBe(
      "2026-11-20T09:30:00.000Z",
    );
  });
});
