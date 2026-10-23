import { describe, expect, it, vi } from "vitest";
import type { AddContext } from "../context";
import { getUnpaidFeeView } from "../unpaid-fee";

const getContext = (
  fee: { bookingId: string; amount: number; kind: string } | null,
  pastIds: string[] = [],
) =>
  ({
    state: {
      addStep: 2,
      addClient: "contact:ruth@example.com",
      addUnpaidFee: fee,
      pastNew: pastIds.map((pastId) => ({ pastId })),
    },
    actions: { openSheet: vi.fn() },
    clientFirst: "Ruth",
  }) as unknown as AddContext;

describe("getUnpaidFeeView", () => {
  it("warns that the client owes a fee, and still lets the stylist book them", () => {
    expect(
      getUnpaidFeeView(
        getContext({ bookingId: "b-1", amount: 35, kind: "no_show" }),
      ).unpaidFeeNote,
    ).toBe("Ruth owes you a £35.00 no-show fee. You can still book them.");
  });

  it("links to the fee's booking when it's loaded", () => {
    const context = getContext(
      { bookingId: "b-1", amount: 35, kind: "no_show" },
      ["b-1"],
    );

    const { openUnpaidFee } = getUnpaidFeeView(context);

    openUnpaidFee?.();

    expect(context.actions.openSheet).toHaveBeenCalledWith("past", {
      selectedPastId: "b-1",
    });

    expect(
      getUnpaidFeeView(
        getContext({ bookingId: "b-2", amount: 35, kind: "no_show" }),
      ).openUnpaidFee,
    ).toBeNull();
  });

  it("says nothing when nothing is owed", () => {
    expect(getUnpaidFeeView(getContext(null)).unpaidFeeNote).toBe("");
  });
});
