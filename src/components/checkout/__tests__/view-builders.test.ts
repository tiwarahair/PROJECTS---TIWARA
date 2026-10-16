import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getDetailView } from "../detail-view";
import { getDialog } from "../dialogs";
import { getFooter } from "../footer";
import { getReceiptView } from "../receipt-view";
import { useCheckout } from "../use-checkout";
import { getCheckoutView } from "../view";

const build = (scenario: string) => {
  const { result } = renderHook(() => useCheckout({ scenario }));
  const checkout = result.current;

  return { checkout, view: getCheckoutView(checkout) };
};

describe("checkout view builders", () => {
  it("an unpaid booking shows its badge, panel and a Checkout footer", () => {
    const { checkout, view } = build("unpaid");
    const detail = getDetailView(checkout, view);

    expect(detail.badges[0]?.label).toBe("Completed · Unpaid");
    expect(detail.panel?.title).toBe("Not checked out");
    expect(getFooter(checkout, view).primaryLabel).toBe("Checkout");
  });

  it("an unpaid no-show fee offers retry, link, record and waive", () => {
    const { checkout, view } = build("fee-unpaid");

    expect(
      getDetailView(checkout, view).actions.map(({ label }) => label),
    ).toEqual([
      "Retry card (1 of 2 left)",
      "Send payment link",
      "Record as paid",
      "Waive fee",
    ]);

    expect(getFooter(checkout, view).show).toBe(false);
  });

  it("the done screen's footer offers Book again and Done", () => {
    const { checkout, view } = build("done");
    const footer = getFooter(checkout, view);

    expect([footer.secondaryLabel, footer.primaryLabel]).toEqual([
      "Book again",
      "Done",
    ]);
  });

  it("the waive dialog explains what happens to the deposit", () => {
    const { checkout, view } = build("waive-dep");
    const dialog = getDialog(checkout, view);

    expect(dialog?.yes).toBe("Waive fee");
    expect(dialog?.body).toContain("deposit");
    expect(getDialog(build("paid").checkout, build("paid").view)).toBeNull();
  });

  it("the receipt lists price adjustments under their line", () => {
    const { checkout, view } = build("reduce-review");

    expect(
      getReceiptView(checkout, view).lines.map(({ isAdjust }) => isAdjust),
    ).toContain(true);
  });
});
