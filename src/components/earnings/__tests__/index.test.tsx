import { act, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Earnings } from "..";
import { getRange, getRangeLabel } from "../dates";
import { getEarningsCsv } from "../export";
import type { Ledger, Transaction } from "../data";
import { formatMoney } from "../../../utils/money";
import type { UserEvent } from "@testing-library/user-event";
import { setupUser } from "../../../test/setup-user";

let user: UserEvent;

const clients = [{ id: "nia", name: "Nia Okafor" }];

const getTransaction = (
  id: string,
  amount: number,
  status: Transaction["status"],
): Transaction => {
  const now = new Date();

  return {
    id,
    client: "nia",
    service: "Silk press",
    bookingRef: "BK-1",
    appointment: now,
    description: "Balance",
    method: "Saved card",
    at: now,
    amount,
    fee: 1.18,
    net: amount - 1.18,
    status,
    payoutId: status === "Paid out" ? "PO-1" : undefined,
  };
};

const getLedger = (overrides: Partial<Ledger> = {}): Ledger => {
  const now = new Date();
  const paid = getTransaction("TX-1", 65, "Paid out");

  return {
    transactions: [paid, getTransaction("TX-2", 40, "Available")],
    payouts: [
      {
        id: "PO-1",
        amount: 63.82,
        gross: 65,
        fees: 1.18,
        refunds: 0,
        sent: now,
        arrive: now,
        status: "Paid",
        items: [paid],
        from: now,
      },
    ],
    available: 38.82,
    pending: 0,
    onHold: 0,
    pausedAmount: 0,
    nextDate: null,
    today: now,
    scenario: "default",
    ...overrides,
  };
};

beforeEach(() => {
  user = setupUser();
});

describe("Earnings helpers", () => {
  it("formats money and ranges", () => {
    expect(formatMoney(-1234.5, { pence: "always" })).toBe("−£1,234.50");
    const range = getRange("custom", "2026-09-28", "2026-10-04");

    expect(getRangeLabel(range)).toBe("28 Sept – 4 Oct 2026");
  });

  it("exports a CSV with a header row", () => {
    const csv = getEarningsCsv(getLedger().transactions, clients);

    expect(csv.split("\n")[0]).toBe(
      "﻿Date,Time,Reference,Booking,Client,Service,Description,Method,Amount (GBP),Card fee (GBP),Net (GBP),Status,Payout",
    );
  });
});

describe("Earnings", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("renders the balance, totals and transactions", () => {
    render(<Earnings ledger={getLedger()} clients={clients} />);
    expect(screen.getAllByText("Available")[0]).toBeInTheDocument();
    expect(screen.getAllByText("£38.82")[0]).toBeInTheDocument();
    expect(screen.getByText("Takings")).toBeInTheDocument();
    expect(screen.getAllByText(/Nia Okafor/)[0]).toBeInTheDocument();

    expect(screen.getByRole("tab", { name: "Transactions" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("shows the amount on hold", () => {
    render(<Earnings ledger={getLedger({ onHold: 85 })} clients={clients} />);

    expect(
      screen.getByText(/£85\.00 on hold · released 24 hours/),
    ).toBeInTheDocument();
  });

  it("export waits for the business name", () => {
    const { rerender } = render(
      <Earnings ledger={getLedger()} clients={clients} />,
    );

    expect(screen.getByRole("button", { name: "Export" })).toBeDisabled();

    rerender(
      <Earnings
        ledger={getLedger()}
        clients={clients}
        businessName="Nia Hair"
      />,
    );

    expect(screen.getByRole("button", { name: "Export" })).toBeEnabled();
  });

  it("empty: offers to copy the booking link", async () => {
    render(
      <Earnings
        ledger={getLedger({ transactions: [], payouts: [] })}
        bookingLink="tiwarashouse.com/nia-hair"
      />,
    );

    expect(screen.getByText("No earnings yet.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Copy booking link" }));
    expect(screen.getByRole("status")).toHaveTextContent("Booking link copied");
  });

  it("setup: asks to continue setup, or for tax details when on hold", async () => {
    const onAddTax = vi.fn();
    const ledger = getLedger({ scenario: "setup" });
    const { unmount } = render(<Earnings ledger={ledger} />);

    expect(
      screen.getByText("Payouts start once setup is complete"),
    ).toBeInTheDocument();

    unmount();
    render(<Earnings ledger={ledger} taxHold={true} onAddTax={onAddTax} />);

    expect(
      screen.getByText("Add your tax details to go live"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add tax details" }));
    expect(onAddTax).toHaveBeenCalled();
  });

  it("paused: explains the recovery", () => {
    render(
      <Earnings
        ledger={getLedger({ scenario: "paused", pausedAmount: 62.4 })}
      />,
    );

    expect(
      screen.getByText(/Payouts paused — £62\.40 being recovered/),
    ).toBeInTheDocument();
  });

  it("paused: Learn more explains why, what caused it and links to Stripe", async () => {
    const onUpdateBank = vi.fn();

    const refund = {
      ...getTransaction("TX-3", -80, "Refunded"),
      description: "Refund",
      method: "Card",
    };

    const ledger = getLedger({ scenario: "paused", pausedAmount: 41.18 });

    render(
      <Earnings
        ledger={{ ...ledger, transactions: [refund, ...ledger.transactions] }}
        clients={clients}
        onUpdateBank={onUpdateBank}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Learn more" }));

    const dialog = screen.getByRole("dialog", {
      name: "Why payouts are paused",
    });

    expect(within(dialog).getByText(/so it’s at −£41\.18/)).toBeInTheDocument();

    expect(
      within(dialog).getByText(/Stripe takes the £41\.18 from your next card/),
    ).toBeInTheDocument();

    expect(
      within(dialog).getByRole("button", { name: /Refund · Nia Okafor/ }),
    ).toBeInTheDocument();

    expect(
      within(dialog).queryByRole("button", { name: /Balance · Nia Okafor/ }),
    ).not.toBeInTheDocument();

    await user.click(
      within(dialog).getByRole("link", { name: "View in Stripe" }),
    );

    expect(onUpdateBank).toHaveBeenCalled();
  });

  it("opens the payout drawer on the payouts tab", async () => {
    render(<Earnings ledger={getLedger()} clients={clients} tab="po" />);

    const [firstPayout] = screen
      .getAllByRole("button")
      .filter(
        (button) =>
          /£/.test(button.textContent ?? "") &&
          /Paid|Failed|In transit/.test(button.textContent ?? ""),
      );

    await user.click(firstPayout!);
    const drawer = screen.getByRole("dialog", { name: "Payout" });

    expect(
      within(drawer).getByText("Included transactions"),
    ).toBeInTheDocument();
  });

  it("export: the dialog closes after download with a toast", async () => {
    render(
      <Earnings
        ledger={getLedger()}
        clients={clients}
        businessName="Nia Hair"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Export" }));
    const dialog = screen.getByRole("dialog", { name: "Export earnings" });

    URL.createObjectURL = vi.fn(() => "blob:test");
    URL.revokeObjectURL = vi.fn();
    await user.click(within(dialog).getByRole("button", { name: "Download" }));
    act(() => vi.advanceTimersByTime(180));

    expect(
      screen.queryByRole("dialog", { name: "Export earnings" }),
    ).not.toBeInTheDocument();

    expect(screen.getByRole("status")).toHaveTextContent(
      "Your export is downloading.",
    );
  });
});
