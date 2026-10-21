import { describe, expect, it } from "vitest";
import type { AccountBooking } from "../data";
import { getBookingMoney, getReceiptHtml } from "../logic";

const PAID_AT = new Date("2026-10-01T09:00:00Z").getTime();

const getBooking = (patch: Partial<AccountBooking>): AccountBooking => ({
  id: "b1",
  ref: "TH-48213",
  status: "confirmed",
  service: "Silk press",
  customisation: "",
  stylistSlug: "crown-studio",
  stylistName: "Crown Studio",
  stylistArea: "Ancoats",
  cover: "",
  isMobile: false,
  where: "Crown Studio, 1 High St, Manchester",
  at: Date.now() + 3 * 864e5,
  minutes: 120,
  pricePence: 6000,
  feePence: 140,
  tipPence: 0,
  mode: "deposit",
  cardLabel: "Visa •••• 4242",
  paymentMethodId: "pm_1",
  payments: [
    { kind: "booking", method: "card", amountPence: 1340, paidAt: PAID_AT },
  ],
  refunds: [],
  ...patch,
});

describe("account logic", () => {
  it("an upcoming booking shows what's paid and what's left to pay", () => {
    const money = getBookingMoney(getBooking({}));

    expect(money.tag[0]).toBe("Confirmed");
    expect(money.paid).toBe("£13.40 paid");
    expect(money.due).toBe(" · £48 to pay at your appointment");
    expect(money.total).toBe("£61.40");
  });

  it("a cancelled booking shows the refund on the receipt", () => {
    const money = getBookingMoney(
      getBooking({
        status: "cancelled",
        refunds: [{ amountPence: 1200, refundedAt: PAID_AT + 864e5 }],
      }),
    );

    expect(money.tag[0]).toBe("Cancelled");
    expect(money.paid).toBe("£1.40 paid · £12 refunded");
    expect(money.due).toBe("");

    expect(money.payments).toEqual([
      { label: "Paid Thu 1 Oct · Visa •••• 4242", amount: "£13.40" },
      { label: "Refunded Fri 2 Oct", amount: "−£12" },
    ]);

    expect(money.lines).toEqual([
      { label: "Silk press", subtitle: "Cancelled", amount: "£1.40" },
    ]);

    expect(money.total).toBe("£1.40");
  });

  it("what's left to pay counts refunds, and an unknown payment method adds no separator", () => {
    const money = getBookingMoney(
      getBooking({
        payments: [
          {
            kind: "booking",
            method: "voucher",
            amountPence: 1340,
            paidAt: PAID_AT,
          },
        ],
        refunds: [{ amountPence: 1340, refundedAt: PAID_AT }],
      }),
    );

    expect(money.due).toBe(" · £61.40 to pay at your appointment");
    expect(money.payments[0]?.label).toBe("Paid Thu 1 Oct");
  });

  it("the downloaded receipt escapes what stylists and clients typed", () => {
    const html = getReceiptHtml(
      {
        ref: "TH-1",
        date: "Thu 1 Oct",
        stylist: "<img src=x onerror=alert(1)>",
        where: "1 High St",
        total: "£1",
        lines: [{ label: "Silk & press", subtitle: "", amount: "£1" }],
        payments: [],
      },
      { first: "Nia", last: "Okafor", email: "", mobile: "" },
    );

    expect(html).not.toContain("<img");
    expect(html).toContain("&#60;img src=x onerror=alert(1)&#62;");
    expect(html).toContain("Silk &#38; press");
  });

  it("a checked-out booking lists the tip and every payment", () => {
    const money = getBookingMoney(
      getBooking({
        status: "completed",
        tipPence: 500,
        payments: [
          {
            kind: "booking",
            method: "card",
            amountPence: 1340,
            paidAt: PAID_AT,
          },
          {
            kind: "booking",
            method: "cash",
            amountPence: 5300,
            paidAt: PAID_AT,
          },
        ],
      }),
    );

    expect(money.lines.map(({ label }) => label)).toEqual([
      "Silk press",
      "Booking fee",
      "Tip",
    ]);

    expect(money.payments[1]?.label).toBe("Paid Thu 1 Oct · Cash");
    expect(money.paid).toBe("£66.40 paid");
  });
});
