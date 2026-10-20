import { act, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CheckoutSheet } from "..";
import { BOOKINGS } from "../data";
import { getInitialCheckout, getMoney } from "../logic";
import { formatMoney } from "../../../utils/money";
import type { UserEvent } from "@testing-library/user-event";
import { setupUser } from "../../../test/setup-user";

let user: UserEvent;

beforeEach(() => {
  user = setupUser();
});

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

const click = async (name: string | RegExp) =>
  await user.click(screen.getByRole("button", { name }));

describe("checkout money", () => {
  it("charges the balance after the deposit, plus the tip and card fee", () => {
    const state = getInitialCheckout({ scenario: "review" });
    const money = getMoney(state, BOOKINGS.zainab!);

    expect(money.items).toBe(100);
    expect(money.due).toBe(80);
    expect(money.tip).toBe(15);
    expect(money.charge).toBe(95);
    expect(money.cardFee).toBe(1.63);
    expect(money.steps).toEqual(["items", "pay", "tip", "review"]);
  });

  it("a price cut below the prepayment becomes a refund", () => {
    const state = getInitialCheckout({ scenario: "reduce-review" });
    const money = getMoney(state, BOOKINGS.nia!);

    expect(money.refundDue).toBe(20);
    expect(money.method).toBe("none");
  });

  it("nothing to take is completed without a charge, even with the tip step open", () => {
    const state = {
      ...getInitialCheckout({ scenario: "reduce-review" }),
      tipOpen: true,
    };

    expect(getMoney(state, BOOKINGS.nia!).method).toBe("none");
  });

  it("the saved card can't take more than was agreed", () => {
    const state = getInitialCheckout({ scenario: "review" });
    const money = getMoney(state, { ...BOOKINGS.zainab!, agreedPrice: 90 });

    expect(money.isOverAgreed).toBe(true);
    expect(money.cardOk).toBe(false);
    expect(money.method).toBe("link");
  });

  it("caps a saved-card tip at a quarter of the price", () => {
    const state = {
      ...getInitialCheckout({ scenario: "review" }),
      tip: "custom" as const,
      tipCustom: "30",
    };

    const money = getMoney(state, BOOKINGS.zainab!);

    expect(money.tipCap).toBe(25);
    expect(money.isTipTooHigh).toBe(true);
  });

  it("formats whole pounds without pence and negatives with a minus sign", () => {
    expect(formatMoney(85)).toBe("£85");
    expect(formatMoney(-20.5)).toBe("−£20.50");
  });
});

describe("CheckoutSheet", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("shows the arrived booking with its balance", () => {
    render(<CheckoutSheet />);
    expect(screen.getByRole("heading", { name: "Zainab Bello" })).toBeVisible();
    expect(screen.getAllByText("£80")[0]).toBeInTheDocument();
  });

  it("checks out by card: items, payment, tip, review, done", async () => {
    render(<CheckoutSheet />);
    await click("Checkout");
    await click("Continue");
    await click("Continue");
    await user.click(screen.getByRole("radio", { name: /15%/ }));
    await click("Continue");
    await click("Charge £95");
    expect(screen.getByRole("button", { name: "Charging" })).toBeDisabled();
    advance(1100);

    expect(
      screen.getByRole("heading", { name: "Checkout complete" }),
    ).toBeInTheDocument();

    expect(screen.getByText("£95 charged to Visa •••• 4242.")).toBeVisible();
  });

  it("validates a price adjustment", async () => {
    render(<CheckoutSheet scenario="items" />);

    await user.click(
      screen.getAllByRole("button", { name: "Adjust price" })[0]!,
    );

    await click("Apply");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Enter the new price.",
    );

    await user.type(screen.getByLabelText(/New price/), "80");
    await user.selectOptions(screen.getByLabelText(/Reason/), "Other");

    await vi.waitFor(() =>
      expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
    );

    await click("Apply");

    await vi.waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Describe the reason.",
      ),
    );

    await user.type(screen.getByLabelText("Describe the reason"), "Loyalty");
    await click("Apply");

    expect(await screen.findByText("Price adjusted")).toBeInTheDocument();
    expect(screen.getByText("£80")).toBeInTheDocument();
  });

  it("resend: asks where to send the receipt", async () => {
    const onResent = vi.fn();

    render(<CheckoutSheet scenario="resend" onResent={onResent} />);
    await user.clear(screen.getByLabelText(/Mobile number/));
    await click("Send receipt");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Enter where to send it.",
    );

    await user.click(screen.getByRole("button", { name: "Email" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await click("Send receipt");

    await vi.waitFor(() =>
      expect(onResent).toHaveBeenCalledWith(expect.stringContaining("@")),
    );
  });

  it("adds an item from the menu", async () => {
    render(<CheckoutSheet scenario="items" />);
    await click("Add item");
    await click(/Beads and cuffs/);
    expect(screen.getByText("Beads and cuffs")).toBeInTheDocument();

    expect(screen.getByRole("status")).toHaveTextContent(
      "Beads and cuffs added",
    );
  });

  it("a soft decline offers a retry", () => {
    render(<CheckoutSheet scenario="declined" />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Card declined: insufficient funds",
    );

    expect(
      screen.getByRole("button", { name: "Retry card (1 of 2 left)" }),
    ).toBeInTheDocument();
  });

  it("refund: rejects more than was paid", async () => {
    render(<CheckoutSheet scenario="refund" />);
    await user.type(screen.getByRole("textbox"), "999");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /You can refund up to/,
    );
  });

  it("refund: an empty amount only complains after trying", async () => {
    render(<CheckoutSheet scenario="refund" />);
    await user.clear(screen.getByRole("textbox"));

    expect(screen.queryByText("Enter an amount.")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Refund/ }));
    expect(await screen.findByText("Enter an amount.")).toBeInTheDocument();
  });

  it("refund: needs a reason, then asks to confirm", async () => {
    render(<CheckoutSheet scenario="refund" />);
    await user.click(screen.getByRole("radio", { name: /Full refund/ }));
    await user.selectOptions(screen.getByRole("combobox"), "");
    await user.click(screen.getByRole("button", { name: /^Refund £/ }));

    expect(await screen.findByText("Choose a reason.")).toBeInTheDocument();

    await user.selectOptions(screen.getByRole("combobox"), "Service issue");
    await user.click(screen.getByRole("button", { name: /^Refund £/ }));

    expect(await screen.findByRole("alertdialog")).toHaveTextContent(
      /Refund £/,
    );
  });

  it("waives a no-show fee from the dialog", async () => {
    render(<CheckoutSheet scenario="waive-dep" />);
    const dialog = screen.getByRole("alertdialog");

    await user.click(within(dialog).getByRole("button", { name: "Waive fee" }));
    expect(screen.getByText("No-show · Fee waived")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Fee waived");
  });

  it("embedded: a real charge waits for the host, and a decline offers a retry", async () => {
    const onPay = vi
      .fn()
      .mockResolvedValueOnce({
        outcome: "soft",
        message: "your card was declined",
      })
      .mockResolvedValueOnce({ outcome: "paid" });

    render(
      <CheckoutSheet booking={BOOKINGS.zainab} start="review" onPay={onPay} />,
    );

    await click("Charge £80");

    expect(onPay).toHaveBeenCalledWith(
      expect.objectContaining({ method: "card", tip: 0 }),
    );

    await screen.findByRole("button", { name: "Retry card (1 of 2 left)" });
    await click("Retry card (1 of 2 left)");

    expect(
      await screen.findByRole("button", { name: "Done" }),
    ).toBeInTheDocument();

    expect(onPay).toHaveBeenCalledTimes(2);
  });

  it("embedded: finishing hands the result to the host", async () => {
    const onComplete = vi.fn();

    render(
      <CheckoutSheet
        booking={BOOKINGS.zainab}
        start="done"
        done={{
          method: "card",
          via: "sms",
          charged: 80,
          tip: 0,
          refundAuto: 0,
        }}
        onComplete={onComplete}
      />,
    );

    await click("Done");

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({ method: "card", charged: 80, total: 100 }),
      "done",
    );
  });
});
