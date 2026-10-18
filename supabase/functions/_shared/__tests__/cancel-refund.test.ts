import { describe, expect, it } from "vitest";
import { getRefundNow } from "../cancel-refund";

describe("getRefundNow", () => {
  it("refunds straight away when there's no fee", () => {
    expect(getRefundNow({ fee_pence: 0, refund_pence: 3000 })).toBe(3000);
    expect(getRefundNow({ refund_pence: 3163 })).toBe(3163);
  });

  it("leaves the refund to the settlement when there's a fee", () => {
    expect(getRefundNow({ fee_pence: 1500, refund_pence: 1500 })).toBe(0);
  });
});
