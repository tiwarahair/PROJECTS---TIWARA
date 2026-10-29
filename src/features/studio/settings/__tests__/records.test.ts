import { describe, expect, it } from "vitest";
import type { PolicyValue } from "../../../../components/payment-policy/types";
import { fromPolicy } from "../records";

const policy: PolicyValue = {
  mode: "deposit",
  deposit: 20,
  refundable: true,
  window: 48,
  grace: 15,
  late: { on: false, kind: "keep", percent: 0 },
  noShow: { on: true, kind: "keep", percent: 0 },
  extras: [],
};

describe("fromPolicy", () => {
  it("a blank percent on a fee that's off or keeps the deposit saves as the default the database accepts", () => {
    expect(fromPolicy(policy, "stylist-1")).toMatchObject({
      late_percent: 50,
      no_show_percent: 50,
    });
  });

  it("a fee charged as a percentage saves what was entered", () => {
    expect(
      fromPolicy(
        {
          ...policy,
          late: { on: true, kind: "pct", percent: 30 },
          noShow: { on: true, kind: "pct", percent: 100 },
        },
        "stylist-1",
      ),
    ).toMatchObject({ late_percent: 30, no_show_percent: 100 });
  });
});
