import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CheckoutSheet } from "../checkout-sheet";
import {
  BOOKINGS,
  formatPounds,
  getInitialCheckout,
  getMoney,
} from "../checkout-data";

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

const click = (name: string | RegExp) =>
  fireEvent.click(screen.getByRole("button", { name }));

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

  it("formats whole pounds without pence and negatives with a minus sign", () => {
    expect(formatPounds(85)).toBe("£85");
    expect(formatPounds(-20.5)).toBe("−£20.50");
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

  it("checks out by card: items, payment, tip, review, done", () => {
    render(<CheckoutSheet />);
    click("Checkout");
    click("Continue");
    click("Continue");
    fireEvent.click(screen.getByRole("radio", { name: /15%/ }));
    click("Continue");
    click("Charge £95");
    expect(screen.getByRole("button", { name: "Charging" })).toBeDisabled();
    advance(1100);

    expect(
      screen.getByRole("heading", { name: "Checkout complete" }),
    ).toBeInTheDocument();

    expect(screen.getByText("£95 charged to Visa •••• 4242.")).toBeVisible();
  });

  it("validates a price adjustment", () => {
    render(<CheckoutSheet scenario="items" />);

    fireEvent.click(
      screen.getAllByRole("button", { name: "Adjust price" })[0]!,
    );

    click("Apply");
    expect(screen.getByRole("alert")).toHaveTextContent("Enter the new price.");
  });

  it("adds an item from the menu", () => {
    render(<CheckoutSheet scenario="items" />);
    click("Add item");
    click(/Beads and cuffs/);
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

  it("refund: rejects more than was paid", () => {
    render(<CheckoutSheet scenario="refund" />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "999" } });
    expect(screen.getByRole("alert")).toHaveTextContent(/You can refund up to/);
  });

  it("waives a no-show fee from the dialog", () => {
    render(<CheckoutSheet scenario="waive-dep" />);
    const dialog = screen.getByRole("alertdialog");

    fireEvent.click(within(dialog).getByRole("button", { name: "Waive fee" }));
    expect(screen.getByText("No-show · Fee waived")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Fee waived");
  });

  it("embedded: finishing hands the result to the host", () => {
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

    click("Done");

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({ method: "card", charged: 80, total: 100 }),
      "done",
    );
  });
});
