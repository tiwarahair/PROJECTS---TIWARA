import { describe, expect, it } from "vitest";
import { findEarlierRefund } from "../earlier-refund";

const refund = (id: string, status: string, reason = "client_cancelled") => ({ id, status, metadata: { reason } });

describe("findEarlierRefund", () => {
  it("reuses a cancellation refund that went through or is pending", () => {
    expect(findEarlierRefund([refund("re_1", "succeeded")])?.id).toBe("re_1");
    expect(findEarlierRefund([refund("re_2", "pending")])?.id).toBe("re_2");
  });

  it("ignores failed or cancelled refunds and other refunds", () => {
    expect(
      findEarlierRefund([refund("re_1", "failed"), refund("re_2", "canceled"), refund("re_3", "succeeded", "slot_taken")]),
    ).toBeUndefined();
  });
});
