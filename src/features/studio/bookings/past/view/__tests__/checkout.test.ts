import { describe, expect, it } from "vitest";
import { getInitialStudioState } from "../../../../core/initial-state";
import type { PastRecord } from "../../../../core/types";
import { getPastCheckout } from "../checkout";

const row: PastRecord = {
  pastId: 1,
  client: null,
  service: "Silk press",
  price: 60,
  when: "Mon",
  time: "10:00",
  duration: "1h",
  status: "No show",
  feeLabel: "£12",
};

describe("past sheet → checkout", () => {
  it("charges only the fee for a no-show", () => {
    const { booking, done, cap } = getPastCheckout(
      getInitialStudioState(),
      row,
    );

    expect(booking).toMatchObject({ client: "Walk-in", price: 12, paid: 0 });
    expect(booking.lines?.[0]).toMatchObject({ name: "No-show fee", base: 12 });

    expect(done).toEqual({
      method: "card",
      via: "",
      charged: 12,
      tip: 0,
      refundAuto: 0,
    });

    expect(cap).toBe(12);
  });

  it("charges the balance after the deposit for a completed visit", () => {
    const state = getInitialStudioState();
    const deposit = (60 * (state.policy.deposit || 20)) / 100;

    const { booking, done, cap } = getPastCheckout(state, {
      ...row,
      status: "Completed",
    });

    expect(booking).toMatchObject({
      price: 60,
      paid: deposit,
      mode: "deposit",
    });

    expect(done).toMatchObject({ method: "card", charged: 60 - deposit });
    expect(cap).toBe(60);
  });
});
