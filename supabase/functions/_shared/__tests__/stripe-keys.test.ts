import { describe, expect, it } from "vitest";
import { getCancelRefundKey, getFeeChargeKey, getFeeRefundKey, getTransferKey } from "../stripe-keys";

const fee = { id: "fee-1", tries: 1, reruns: 0, refunded_pence: 0 };

describe("Stripe keys", () => {
  it("a fee's first run keeps the keys it always had", () => {
    expect(getFeeChargeKey(fee)).toBe("fee:fee-1:try:1");
    expect(getFeeRefundKey(fee, 500)).toBe("fee:fee-1:refund:0:500");
  });

  it("a rerun of a stuck fee gets new keys without using up a try", () => {
    expect(getFeeChargeKey({ ...fee, reruns: 1 })).toBe("fee:fee-1:try:1:rerun:1");
    expect(getFeeRefundKey({ ...fee, reruns: 2 }, 500)).toBe("fee:fee-1:refund:0:500:rerun:2");
  });

  it("each retry of a failed cancellation refund or transfer gets a new key", () => {
    expect(getCancelRefundKey("b-1", "client_cancelled", 3000, 0)).toBe("booking:b-1:client_cancelled-refund:3000");
    expect(getCancelRefundKey("b-1", "client_cancelled", 3000, 2)).toBe("booking:b-1:client_cancelled-refund:3000:retry:2");
    expect(getTransferKey("p-1", 0)).toBe("fee-transfer:p-1");
    expect(getTransferKey("p-1", 1)).toBe("fee-transfer:p-1:retry:1");
  });
});
