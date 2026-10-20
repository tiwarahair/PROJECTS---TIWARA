import { describe, expect, it } from "vitest";
import { getRow } from "../../../../test/studio-booking-row";
import { isActiveRow, toPastRecord, toStudioBooking } from "../records";

const completed = (patch: Parameters<typeof getRow>[0]) =>
  getRow({
    status: "completed",
    final_price_pence: 6500,
    checkout: {
      lines: [
        {
          name: "Silk press",
          subtitle: "",
          base_pence: 6500,
          adjustment_pence: 0,
          reason: "",
        },
      ],
      method: "card",
      via: "",
    },
    payments: [
      {
        id: "p-1",
        kind: "booking",
        method: "card",
        amount_pence: 1448,
        platform_fee_pence: 148,
        tip_pence: 0,
        created_at: "2026-10-15T10:00:00+00:00",
      },
      {
        id: "p-2",
        kind: "balance",
        method: "card",
        amount_pence: 6200,
        platform_fee_pence: 0,
        tip_pence: 1000,
        created_at: "2026-10-20T10:00:00+00:00",
      },
    ],
    ...patch,
  });

describe("a completed booking's checkout", () => {
  it("shows what was paid by card, with the tip", () => {
    expect(toPastRecord(completed({}))).toMatchObject({
      meta: "Paid · Card",
      price: 65,
      checkout: { method: "card", charged: 62, tip: 0, paid: 13, total: 65 },
    });
  });

  it("a link still to pay, then paid", () => {
    const link = {
      purpose: "balance",
      status: "pending",
      sent_count: 1,
      amount_pence: 5200,
      created_at: "2026-10-20T10:00:00+00:00",
    };

    const sent = completed({
      checkout: { lines: [], method: "link", via: "email" },
      payments: [],
      payment_links: [link],
    });

    expect(toPastRecord(sent)).toMatchObject({ meta: "Link sent · £52 due" });

    expect(
      toPastRecord({
        ...sent,
        payment_links: [{ ...link, status: "paid" }],
        payments: [
          {
            id: "p-3",
            kind: "balance",
            method: "card",
            amount_pence: 5200,
            platform_fee_pence: 0,
            tip_pence: 0,
            created_at: "2026-10-21T10:00:00+00:00",
          },
        ],
      }),
    ).toMatchObject({ meta: "Paid · Link", linkPaid: true, linkVia: "link" });

    expect(
      toPastRecord({
        ...sent,
        payment_links: [{ ...link, status: "cancelled" }],
        payments: [
          {
            id: "p-5",
            kind: "balance",
            method: "cash",
            amount_pence: 5200,
            platform_fee_pence: 0,
            tip_pence: 0,
            created_at: "2026-10-21T10:00:00+00:00",
          },
        ],
      }),
    ).toMatchObject({ meta: "Paid · Cash", linkPaid: true, linkVia: "cash" });

    expect(
      toPastRecord({
        ...sent,
        payments: [
          {
            id: "p-7",
            kind: "balance",
            method: "cash",
            amount_pence: 1300,
            platform_fee_pence: 0,
            tip_pence: 0,
            created_at: "2026-10-19T10:00:00+00:00",
          },
        ],
      }),
    ).toMatchObject({ meta: "Link sent · £52 due" });
  });

  it("a recorded payment can be corrected", () => {
    const row = completed({
      checkout: { lines: [], method: "record", via: "cash" },
      payments: [
        {
          id: "p-4",
          kind: "balance",
          method: "cash",
          amount_pence: 5500,
          platform_fee_pence: 0,
          tip_pence: 300,
          created_at: "2026-10-20T10:00:00+00:00",
        },
      ],
    });

    expect(toPastRecord(row)).toMatchObject({
      meta: "Paid · Cash",
      recordedPayment: { id: "p-4", amount: 55, tip: 3, via: "cash" },
    });
  });

  it("a lower price refunds the card part and records the cash handed back", () => {
    const row = completed({
      checkout: { lines: [], method: "none", via: "" },
      refunds: [
        { amount_pence: 1300, reason: "price_lowered", method: "card" },
        { amount_pence: 700, reason: "price_lowered", method: "cash" },
      ],
    });

    expect(toPastRecord(row)).toMatchObject({
      meta: "Refunded £20",
      checkout: { refundAuto: 13, cashBack: 7, cashBackVia: "cash" },
    });
  });

  it("completed but unpaid is back with the active bookings", () => {
    const row = completed({
      unpaid_at: "2026-10-20T12:00:00+00:00",
      payments: [],
    });

    expect(isActiveRow(row)).toBe(true);

    expect(toStudioBooking(row)).toMatchObject({
      checkoutUnpaid: true,
      completed: true,
      status: "arrived",
    });
  });

  it("completed but unpaid counts what was taken at checkout and its final price", () => {
    const row = completed({
      unpaid_at: "2026-10-20T12:00:00+00:00",
      final_price_pence: 6000,
      payments: [
        {
          id: "p-1",
          kind: "booking",
          method: "card",
          amount_pence: 1448,
          platform_fee_pence: 148,
          tip_pence: 0,
          created_at: "2026-10-15T10:00:00+00:00",
        },
        {
          id: "p-6",
          kind: "balance",
          method: "cash",
          amount_pence: 3500,
          platform_fee_pence: 0,
          tip_pence: 500,
          created_at: "2026-10-20T10:00:00+00:00",
        },
      ],
    });

    expect(toStudioBooking(row)).toMatchObject({
      price: 60,
      agreedPrice: 65,
      paidOnline: 13,
      paidLater: 30,
    });
  });
});
