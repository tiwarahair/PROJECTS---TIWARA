import { describe, expect, it } from "vitest";
import { findEarlierRefund } from "../earlier-refund";

const refund = (id: string, status: string, reason = "client_cancelled") => ({ id, status, metadata: { reason } });

describe("findEarlierRefund", () => {
  it("reuses a refund for the same reason that went through or is pending", () => {
    expect(findEarlierRefund([refund("re_1", "succeeded")], "client_cancelled")?.id).toBe("re_1");
    expect(findEarlierRefund([refund("re_2", "pending")], "client_cancelled")?.id).toBe("re_2");
  });

  it("ignores failed or cancelled refunds and refunds for other reasons", () => {
    expect(
      findEarlierRefund(
        [refund("re_1", "failed"), refund("re_2", "canceled"), refund("re_3", "succeeded", "stylist_cancelled")],
        "client_cancelled",
      ),
    ).toBeUndefined();
  });
});
