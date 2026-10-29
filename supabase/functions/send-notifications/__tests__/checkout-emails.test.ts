import { describe, expect, it } from "vitest";
import { checkoutReceipt } from "../checkout-emails";
import type { Receipt } from "../checkout-emails";

const DAY_MS = 24 * 60 * 60 * 1000;

const receipt: Receipt = {
  ref: "TH-ABC123",
  service_name: "Silk press",
  stylist_name: "Tiwára's House",
  starts_at: "2026-10-22T16:30:00Z",
  ends_at: "2026-10-22T18:30:00Z",
  is_mobile: false,
  where: "Tiwára's House, 1 High St, Manchester, M1 1AA",
  client_name: "Nia Okafor",
  client_phone: "07700 900123",
  notes: null,
  address_notes: null,
  lines: null,
  final_pence: 10000,
  tip_pence: 0,
  payments: [{ kind: "balance", method: "card", amount_pence: 10000, tip_pence: 0 }],
  refunded_pence: 0,
};

const getText = (changes: Partial<Receipt>) => checkoutReceipt({ ...receipt, ...changes }).text;

describe("checkout receipt", () => {
  it("lists money given back once per method", () => {
    const text = getText({
      given_back_pence: 1500,
      given_back_via: "bank",
      given_back: [
        { method: "cash", amount_pence: 500 },
        { method: "bank", amount_pence: 1000 },
      ],
    });

    expect(text).toContain("Given back by cash: £5.00");
    expect(text).toContain("Given back by bank transfer: £10.00");
    expect(text).not.toContain("£15.00");
  });

  it("still reads a receipt queued before the list existed", () => {
    expect(getText({ given_back_pence: 700, given_back_via: "cash" })).toContain("Given back by cash: £7.00");
  });

  it("says how long a card refund takes only while it's recent", () => {
    const recent = new Date(Date.now() - 2 * DAY_MS).toISOString();
    const old = new Date(Date.now() - 30 * DAY_MS).toISOString();

    expect(getText({ refunded_pence: 2000, refunded_at: recent })).toContain(
      "Refunded to your card: £20.00. It can take 5–10 working days to show.",
    );

    const oldText = getText({ refunded_pence: 2000, refunded_at: old });

    expect(oldText).toContain("Refunded to your card: £20.00\n");
    expect(oldText).not.toContain("working days");
  });
});
