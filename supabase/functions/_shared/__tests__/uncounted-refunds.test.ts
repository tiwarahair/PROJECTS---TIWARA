import { describe, expect, it } from "vitest";
import { getRefundsBefore, getUncountedRefunds, readCountedRefunds, toCountedMetadata } from "../uncounted-refunds";

const refunds = [
  { id: "re_before", amount: 500, status: "succeeded", created: 100 },
  { id: "re_during", amount: 700, status: "pending", created: 200 },
  { id: "re_failed", amount: 900, status: "failed", created: 200 },
];

describe("getUncountedRefunds", () => {
  it("is the live refunds the transfer didn't allow for", () => {
    expect(getUncountedRefunds(refunds, ["re_before"]).map(({ id }) => id)).toEqual(["re_during"]);
  });

  it("is nothing when the transfer allowed for every refund", () => {
    expect(getUncountedRefunds(refunds, ["re_before", "re_during"])).toEqual([]);
  });
});

describe("getRefundsBefore", () => {
  it("counts the live refunds made before an earlier try's transfer", () => {
    expect(getRefundsBefore(refunds, 150)).toEqual(["re_before"]);
  });
});

describe("the refunds a transfer allowed for", () => {
  it("are read back exactly from the transfer", () => {
    expect(readCountedRefunds(toCountedMetadata(["re_1", "re_2"]))).toEqual(["re_1", "re_2"]);
  });

  it("are none when the transfer allowed for none, written so Stripe keeps it", () => {
    expect(toCountedMetadata([])).toEqual({ counted_refunds: "none" });
    expect(readCountedRefunds(toCountedMetadata([]))).toEqual([]);
  });

  it("aren't known for a transfer that didn't record them", () => {
    expect(readCountedRefunds({ payment_id: "p1" })).toBeNull();
  });
});
