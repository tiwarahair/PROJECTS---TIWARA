import { describe, expect, it } from "vitest";
import { toNotification } from "../activity-records";
import { toHomeRange } from "../records";

const period = (overrides = {}) => ({
  bookings: 0,
  booked_minutes: 0,
  open_minutes: 0,
  new_clients: 0,
  revenue_pence: 0,
  ...overrides,
});

// 2pm UK time on Wednesday 21 October 2026
const now = new Date("2026-10-21T13:00:00Z");

describe("Home's numbers", () => {
  it("shows each tile against the period before, with drops marked", () => {
    const range = toHomeRange(
      {
        today: "2026-10-21",
        current: period({
          bookings: 6,
          booked_minutes: 300,
          open_minutes: 600,
          new_clients: 2,
          revenue_pence: 45000,
        }),
        previous: period({
          bookings: 8,
          booked_minutes: 240,
          open_minutes: 600,
          revenue_pence: 30000,
        }),
        buckets: { "2026-10-21": 12000, "2026-10-15": 33000 },
      },
      "week",
    );

    expect(range.stats).toEqual({
      bookings: ["6", { text: "−25%", isDown: true }],
      revenue: ["£450", { text: "+50%", isDown: false }],
      occupancy: ["50%", { text: "+10", isDown: false }],
      clients: ["2", null],
    });

    expect(range.chart).toEqual([330, 0, 0, 0, 0, 0, 120]);

    expect(range.labels).toEqual([
      "Thu",
      "Fri",
      "Sat",
      "Sun",
      "Mon",
      "Tue",
      "Wed",
    ]);

    expect(range.tips.at(-1)).toBe("Today");
  });

  it("shows no occupancy when nothing was open", () => {
    const range = toHomeRange(
      {
        today: "2026-10-21",
        current: period(),
        previous: period(),
        buckets: {},
      },
      "today",
    );

    expect(range.stats.occupancy).toEqual(["—", null]);
    expect(range.tips[0]).toBe("08:00");
  });
});

describe("the activity feed", () => {
  const row = {
    id: "event:1",
    kind: "client_cancelled",
    at: "2026-10-21T12:30:00Z",
    booking_id: "b-1",
    client_first: "Ada",
    service: "Silk press",
    amount_pence: null,
    is_unread: true,
  };

  it("words what the client did and opens the booking", () => {
    expect(toNotification(row, now)).toEqual({
      id: "event:1",
      at: "2026-10-21T12:30:00Z",
      title: "Booking cancelled",
      body: "Ada cancelled Silk press.",
      time: "30m ago",
      unread: true,
      bookingId: "b-1",
    });
  });

  it("sends payouts to Earnings and leaves out kinds it doesn't know", () => {
    const payout = {
      ...row,
      kind: "payout_paid",
      booking_id: null,
      amount_pence: 31200,
    };

    expect(toNotification(payout, now)).toMatchObject({
      body: "£312.00 has been paid to your bank.",
      opensEarnings: true,
    });

    expect(toNotification({ ...row, kind: "something_else" }, now)).toBeNull();
  });

  it("opens Reviews when we've decided on a reported review", () => {
    expect(
      toNotification({ ...row, kind: "review_text_removed" }, now),
    ).toMatchObject({
      title: "Review words removed",
      body: "We removed the words of Ada’s review. The stars still count.",
      opensReviews: true,
    });
  });
});
