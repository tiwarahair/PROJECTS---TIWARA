import { act, render, renderHook, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CheckoutSheet } from "..";
import type { CheckoutSheetProps } from "..";
import type { CheckoutBooking } from "../data";
import { getFinalized, getInitialCheckout, getMoney } from "../logic";
import { useCheckout } from "../use-checkout";
import { formatMoney } from "../../../utils/money";
import type { UserEvent } from "@testing-library/user-event";
import { setupUser } from "../../../test/setup-user";

let user: UserEvent;

beforeEach(() => {
  user = setupUser();
});

const click = async (name: string | RegExp) =>
  await user.click(screen.getByRole("button", { name }));

const zainab: CheckoutBooking = {
  client: "Zainab Bello",
  first: "Zainab",
  service: "Knotless braids",
  meta: "Medium, mid-back",
  price: 85,
  addons: [["Boho curls", 15]],
  mode: "deposit",
  paid: 20,
  card: "4242",
  brand: "Visa",
  paidOn: "",
  phone: "07700 900418",
  email: "zainab.bello@gmail.com",
  day: "Thu 10 Sep",
  time: "10:00–15:00",
  arrived: "",
};

const nia: CheckoutBooking = {
  ...zainab,
  client: "Nia Johnson",
  first: "Nia",
  service: "Silk press",
  price: 100,
  addons: [],
  mode: "full",
  paid: 100,
  card: "1881",
};

const getReview = (booking = zainab) => ({
  ...getInitialCheckout({ booking, start: "review" }),
  tip: 15,
});

const getReduced = () => {
  const state = getInitialCheckout({ booking: nia, start: "review" });

  state.lines[0]!.adjustment = -20;

  return state;
};

const renderSheet = (props: Partial<CheckoutSheetProps> = {}) =>
  render(
    <CheckoutSheet
      booking={zainab}
      stylist={{ name: "Amara Beauty", address: "", vat: "" }}
      menu={[{ title: "Add-ons", rows: [["Beads and cuffs", 8, ""]] }]}
      onPay={vi.fn()}
      onComplete={vi.fn()}
      {...props}
    />,
  );

describe("checkout money", () => {
  it("charges the balance after the deposit, plus the tip and card fee", () => {
    const money = getMoney(getReview(), zainab);

    expect(money.items).toBe(100);
    expect(money.due).toBe(80);
    expect(money.tip).toBe(15);
    expect(money.charge).toBe(95);
    expect(money.cardFee).toBe(1.63);
    expect(money.steps).toEqual(["items", "pay", "tip", "review"]);
  });

  it("a price cut below the prepayment becomes a refund", () => {
    const money = getMoney(getReduced(), nia);

    expect(money.refundDue).toBe(20);
    expect(money.method).toBe("none");
  });

  it("a refund beyond what was paid online is handed back the way it was paid", () => {
    const state = getReduced();

    const booking = {
      ...nia,
      refundableOnline: 15,
      recordedVia: "cash",
    };

    const money = getMoney(state, booking);

    expect([money.refundCard, money.cashBack]).toEqual([15, 5]);

    expect(getFinalized(state, booking).done).toMatchObject({
      refundAuto: 15,
      cashBack: 5,
    });
  });

  it("nothing to take is completed without a charge, even with the tip step open", () => {
    const state = {
      ...getReduced(),
      tipOpen: true,
    };

    expect(getMoney(state, nia).method).toBe("none");
  });

  it("the saved card can't take more than was agreed", () => {
    const money = getMoney(getReview(), { ...zainab, agreedPrice: 90 });

    expect(money.isOverAgreed).toBe(true);
    expect(money.cardOk).toBe(false);
    expect(money.method).toBe("link");
  });

  it("caps a saved-card tip at a quarter of the price", () => {
    const state = {
      ...getReview(),
      tip: "custom" as const,
      tipCustom: "30",
    };

    const money = getMoney(state, zainab);

    expect(money.tipCap).toBe(25);
    expect(money.isTipTooHigh).toBe(true);
  });

  it("formats whole pounds without pence and negatives with a minus sign", () => {
    expect(formatMoney(85)).toBe("£85");
    expect(formatMoney(-20.5)).toBe("−£20.50");
  });
});

describe("CheckoutSheet", () => {
  it("opens on the booking's items with its balance", () => {
    renderSheet();
    expect(screen.getByText("Knotless braids")).toBeVisible();
    expect(screen.getAllByText("£80")[0]).toBeInTheDocument();
  });

  it("validates a price adjustment", async () => {
    renderSheet();

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

  it("adds an item from the menu", async () => {
    renderSheet();
    await click("Add item");
    await click(/Beads and cuffs/);
    expect(screen.getByText("Beads and cuffs")).toBeInTheDocument();

    expect(screen.getByRole("status")).toHaveTextContent(
      "Beads and cuffs added",
    );
  });

  it("a real charge waits for the host, and a decline offers a retry", async () => {
    const onPay = vi
      .fn()
      .mockResolvedValueOnce({
        outcome: "soft",
        message: "your card was declined",
      })
      .mockResolvedValueOnce({ outcome: "paid" });

    renderSheet({ start: "review", onPay });

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

  it("a double tap on Charge charges once", async () => {
    const onPay = vi.fn(() => new Promise<never>(() => {}));

    const { result } = renderHook(() =>
      useCheckout({
        booking: zainab,
        stylist: { name: "Amara Beauty", address: "", vat: "" },
        menu: [],
        start: "review",
        onPay,
        onComplete: vi.fn(),
      }),
    );

    act(() => {
      result.current.complete();
      result.current.complete();
    });

    expect(onPay).toHaveBeenCalledTimes(1);
  });

  it("a refund to a saved card without its last 4 digits says their saved card", async () => {
    renderSheet({
      booking: { ...nia, card: "saved" },
      start: "refund",
      done: { method: "card", via: "sms", charged: 0, tip: 0, refundAuto: 0 },
    });

    await user.selectOptions(screen.getByRole("combobox"), "Goodwill");
    await click(/^Refund £/);

    expect(
      screen.getByText("Refund £100 to their saved card?"),
    ).toBeInTheDocument();
  });

  it("finishing hands the result to the host", async () => {
    const onComplete = vi.fn();

    renderSheet({
      start: "done",
      done: { method: "card", via: "sms", charged: 80, tip: 0, refundAuto: 0 },
      onComplete,
    });

    await click("Done");

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({ method: "card", charged: 80, total: 100 }),
      "done",
    );
  });
});

describe("resending the receipt", () => {
  const done = {
    method: "card" as const,
    via: "",
    charged: 80,
    tip: 0,
    refundAuto: 0,
  };

  const getEmail = () =>
    screen.getByRole("textbox", { name: /^Email address/ });

  it("sends by email only, to the client's address by default", () => {
    renderSheet({ start: "resend", done });

    expect(
      screen.queryByRole("button", { name: "SMS" }),
    ).not.toBeInTheDocument();

    expect(getEmail()).toHaveValue("zainab.bello@gmail.com");
  });

  it("sends to the edited address, then leaves once the host has sent it", async () => {
    let finish = () => {};

    const onResent = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );

    const onExit = vi.fn();

    renderSheet({ start: "resend", done, onResent, onExit });

    await user.clear(getEmail());
    await user.type(getEmail(), "zainab@work.test");
    await click("Send receipt");

    expect(onResent).toHaveBeenCalledWith("zainab@work.test");
    expect(screen.getByRole("button", { name: "Sending" })).toBeDisabled();
    expect(onExit).not.toHaveBeenCalled();

    finish();

    await vi.waitFor(() => expect(onExit).toHaveBeenCalled());
  });

  it("resending from the receipt goes back to the receipt", async () => {
    const onResent = vi.fn(() => Promise.resolve());
    const onExit = vi.fn();

    renderSheet({ start: "receipt", done, onResent, onExit });

    await click("Resend receipt");
    await click("Send receipt");

    expect(
      await screen.findByRole("button", { name: "Resend receipt" }),
    ).toBeInTheDocument();

    expect(onResent).toHaveBeenCalled();
    expect(onExit).not.toHaveBeenCalled();
  });

  it("back from resending goes back to the receipt it came from", async () => {
    const onExit = vi.fn();

    renderSheet({ start: "receipt", done, onExit });

    await click("Resend receipt");
    await click("Back");

    expect(
      screen.getByRole("button", { name: "Resend receipt" }),
    ).toBeInTheDocument();

    expect(onExit).not.toHaveBeenCalled();
  });

  it("a failed send stays open and says why", async () => {
    const onResent = vi
      .fn()
      .mockRejectedValue(new Error("Enter a valid email address."));

    const onExit = vi.fn();

    renderSheet({ start: "resend", done, onResent, onExit });

    await click("Send receipt");

    expect(
      await screen.findByText("Enter a valid email address."),
    ).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Send receipt" })).toBeEnabled();

    expect(onExit).not.toHaveBeenCalled();
  });

  it("checks the address before sending", async () => {
    const onResent = vi.fn();

    renderSheet({ start: "resend", done, onResent });

    await user.clear(getEmail());
    await user.type(getEmail(), "zainab");
    await click("Send receipt");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Enter a valid email address.",
    );

    expect(onResent).not.toHaveBeenCalled();
  });
});
