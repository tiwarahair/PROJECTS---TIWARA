import { describe, expect, it } from "vitest";
import type { StudioBookingRow } from "../../../../lib/studio-api";
import { getFeeFlags, getRefundNote } from "../fee-records";

type FeeRow = StudioBookingRow["booking_fees"][number];

const getFee = (patch: Partial<FeeRow>): FeeRow => ({
  id: "fee-1",
  kind: "no_show",
  status: "pending",
  amount_pence: 5000,
  kept_pence: 3000,
  refund_pence: 0,
  charge_pence: 2000,
  tries: 0,
  hard_decline: false,
  decline_message: null,
  card_label: null,
  waived_at: null,
  created_at: "2026-10-17T12:00:00Z",
  ...patch,
});

describe("getFeeFlags", () => {
  it("shows a pending fee that can still be waived", () => {
    expect(getFeeFlags(getFee({}))).toMatchObject({
      feeLabel: "£50.00",
      feePending: true,
      feeKept: true,
      meta: "Fee pending",
    });
  });

  it("shows a declined fee with its card and the retries left", () => {
    expect(
      getFeeFlags(
        getFee({ status: "unpaid", tries: 1, card_label: "Visa •••• 4242" }),
      ),
    ).toMatchObject({
      feeUnpaid: true,
      feeTries: 2,
      feeCharge: 20,
      feeCard: "Visa •••• 4242",
      feeLinkResends: 0,
      meta: "Fee unpaid",
    });
  });

  it("counts the link resends left", () => {
    expect(
      getFeeFlags(getFee({ status: "unpaid" }), {
        status: "pending",
        sent_count: 2,
      }),
    ).toMatchObject({ feeLinkResends: 1, meta: "Fee link sent" });
  });

  it("allows no retries after a hard decline", () => {
    expect(
      getFeeFlags(getFee({ status: "unpaid", tries: 1, hard_decline: true })),
    ).toMatchObject({ feeTries: 0 });
  });

  it("shows a waived fee as waived, even before it settles", () => {
    expect(
      getFeeFlags(getFee({ waived_at: "2026-10-17T13:00:00Z" })),
    ).toMatchObject({ waived: true, meta: "Fee waived" });
  });

  it("shows nothing for a no-charge settlement", () => {
    expect(getFeeFlags(getFee({ amount_pence: 0 }))).toEqual({});
  });
});

describe("getRefundNote", () => {
  it("says what was refunded, or what goes back when the fee settles", () => {
    expect(getRefundNote(3000, undefined)).toBe(" £30.00 refunded.");

    expect(getRefundNote(0, getFee({ refund_pence: 6000 }))).toBe(
      " £60.00 goes back to the client when the fee settles.",
    );
  });
});
