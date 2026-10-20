import { describe, expect, it } from "vitest";
import type { StudioEarnings } from "../../../../lib/studio-api/earnings";
import { getFailedPayout, toLedger } from "../records";

const line = {
  booking_id: "b-1",
  booking_ref: "TH-1",
  client_id: "c-1",
  client_name: "Nia Okafor",
  service: "Silk press",
  appointment: "2026-10-19T10:00:00+00:00",
  at: "2026-10-19T12:00:00+00:00",
  note: null,
};

const earnings: StudioEarnings = {
  lines: [
    {
      ...line,
      id: "p-1",
      description: "Deposit",
      method: "Card online",
      amount_pence: 3000,
      card_fee_pence: 65,
      status: "Paid out",
      payout_id: "po-1",
    },
    {
      ...line,
      id: "p-2",
      description: "Balance",
      method: "Cash",
      amount_pence: 7000,
      card_fee_pence: null,
      status: "Recorded",
      payout_id: null,
    },
  ],
  payouts: [
    {
      id: "po-1",
      stylist_id: "s-1",
      stripe_payout_id: "po_1",
      amount_pence: 2935,
      status: "failed",
      arrival_date: "2026-10-22",
      failure_message: null,
      bank_label: "Monzo •••• 1234",
      emailed_status: "failed",
      created_at: "2026-10-20T09:00:00+00:00",
      updated_at: "2026-10-20T09:00:00+00:00",
    },
  ],
  balance: { available_pence: 1200, pending_pence: 500, next_payout: null },
};

describe("the stylist's earnings", () => {
  it("shows their part, card fees, recorded money and what each payout paid out", () => {
    const ledger = toLedger(earnings);

    expect(ledger.transactions[0]).toMatchObject({
      amount: 30,
      fee: 0.65,
      net: 29.35,
      payoutId: "po_1",
    });

    expect(ledger.transactions[1]).toMatchObject({
      fee: null,
      isRecorded: true,
      status: "Recorded",
    });

    expect(ledger.payouts[0]).toMatchObject({
      id: "po_1",
      amount: 29.35,
      gross: 30,
      fees: 0.65,
      status: "Failed",
    });

    expect([ledger.available, ledger.pending]).toEqual([12, 5]);
    expect(getFailedPayout(earnings)).toBe(29.35);
  });
});
