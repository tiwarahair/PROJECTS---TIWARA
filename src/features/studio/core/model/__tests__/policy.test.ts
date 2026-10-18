import { describe, expect, it } from "vitest";
import { getInitialStudioState } from "../../initial-state";
import { getPolicyFee } from "../policy";

const state = getInitialStudioState();

const depositPolicy = (refundable: boolean) => ({
  ...state.policy,
  mode: "deposit" as const,
  deposit: 20,
  refundable,
  noShow: { on: false, kind: "pct" as const, percent: 50 },
});

describe("getPolicyFee", () => {
  it("follows the policy agreed at booking over the current one", () => {
    const fee = getPolicyFee(state, "noShow", {
      price: 100,
      agreedPolicy: {
        ...depositPolicy(true),
        noShow: { on: true, kind: "pct", percent: 50 },
      },
    });

    expect(fee.amount).toBe(50);
  });

  it("refunds a refundable deposit when there's no charge", () => {
    expect(
      getPolicyFee(state, "noShow", {
        price: 100,
        agreedPolicy: depositPolicy(true),
      }).refund,
    ).toBe("Deposit refunded");
  });

  it("keeps a non-refundable deposit when there's no charge", () => {
    expect(
      getPolicyFee(state, "noShow", {
        price: 100,
        agreedPolicy: depositPolicy(false),
      }).refund,
    ).toBe("Deposit kept (non-refundable)");
  });
});
