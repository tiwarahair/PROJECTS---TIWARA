import { describe, expect, it } from "vitest";
import { getInitialStudioState } from "../../initial-state";
import { getPolicyFee } from "../policy";

const state = getInitialStudioState();

const depositPolicy = (refundable: boolean) => ({
  ...state.policy,
  mode: "deposit" as const,
  deposit: 20,
  refundable,
  noShow: { on: false, kind: "percent" as const, percent: 50 },
});

describe("getPolicyFee", () => {
  it("follows the policy agreed at booking over the current one", () => {
    const fee = getPolicyFee(state, "noShow", {
      price: 100,
      agreedPolicy: {
        ...depositPolicy(true),
        noShow: { on: true, kind: "percent", percent: 50 },
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

  it("keeps a non-refundable deposit when there's no charge, without a fee to charge", () => {
    expect(
      getPolicyFee(state, "noShow", {
        price: 100,
        agreedPolicy: depositPolicy(false),
      }),
    ).toEqual({
      amount: 0,
      refund: "£20 deposit kept (non-refundable)",
      kept: 20,
    });
  });

  it("an unpaid booking has no deposit to keep, so nothing is said to be kept", () => {
    expect(
      getPolicyFee(state, "noShow", {
        price: 100,
        agreedPolicy: depositPolicy(false),
        paid: "none",
      }),
    ).toEqual({ amount: 0, refund: "Nothing charged", kept: 0 });
  });

  it("with the fee on, a non-refundable deposit is still the least it charges", () => {
    expect(
      getPolicyFee(state, "noShow", {
        price: 100,
        agreedPolicy: {
          ...depositPolicy(false),
          noShow: { on: true, kind: "percent", percent: 10 },
        },
      }).amount,
    ).toBe(20);
  });
});
