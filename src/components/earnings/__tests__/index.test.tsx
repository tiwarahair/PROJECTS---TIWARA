import { act, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Earnings } from "..";
import { getRange, getRangeLabel } from "../dates";
import { buildLedger } from "../ledger";
import { getEarningsCsv } from "../export";
import { formatMoney } from "../../../utils/money";
import type { UserEvent } from "@testing-library/user-event";
import { setupUser } from "../../../test/setup-user";

let user: UserEvent;

beforeEach(() => {
  user = setupUser();
});

describe("Earnings ledger", () => {
  it("is deterministic for a scenario", () => {
    const first = buildLedger("default");
    const second = buildLedger("default");

    expect(first.transactions.map(({ id, amount }) => [id, amount])).toEqual(
      second.transactions.map(({ id, amount }) => [id, amount]),
    );

    expect(first.transactions.length).toBeGreaterThan(50);
  });

  it("marks one payout as failed in the default scenario", () => {
    const { payouts } = buildLedger("default");

    expect(payouts.filter(({ status }) => status === "Failed")).toHaveLength(1);
  });

  it("has no transactions in the empty and setup scenarios", () => {
    expect(buildLedger("empty").transactions).toEqual([]);
    expect(buildLedger("setup").payouts).toEqual([]);
  });

  it("formats money and ranges", () => {
    expect(formatMoney(-1234.5, { pence: "always" })).toBe("−£1,234.50");
    const range = getRange("custom", "2026-09-28", "2026-10-04");

    expect(getRangeLabel(range)).toBe("28 Sept – 4 Oct 2026");
  });

  it("exports a CSV with a header row", () => {
    const csv = getEarningsCsv(buildLedger("onhold").transactions.slice(0, 2));

    expect(csv.split("\n")[0]).toBe(
      "﻿Date,Time,Reference,Booking,Client,Service,Description,Method,Amount (GBP),Card fee (GBP),Net (GBP),Status,Payout",
    );
  });
});

describe("Earnings", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("renders the balance, totals and transactions", () => {
    render(<Earnings />);
    expect(screen.getAllByText("Available")[0]).toBeInTheDocument();
    expect(screen.getByText("Takings")).toBeInTheDocument();

    expect(screen.getByRole("tab", { name: "Transactions" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("empty: offers to copy the booking link", async () => {
    render(<Earnings scenario="empty" />);
    expect(screen.getByText("No earnings yet.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Copy booking link" }));
    expect(screen.getByRole("status")).toHaveTextContent("Booking link copied");
  });

  it("setup: asks to continue setup, or for tax details when on hold", async () => {
    const onAddTax = vi.fn();
    const { unmount } = render(<Earnings scenario="setup" />);

    expect(
      screen.getByText("Payouts start once setup is complete"),
    ).toBeInTheDocument();

    unmount();
    render(<Earnings scenario="setup" taxHold={true} onAddTax={onAddTax} />);
    await user.click(screen.getByRole("button", { name: "Add tax details" }));
    expect(onAddTax).toHaveBeenCalled();
  });

  it("paused: explains the recovery", () => {
    render(<Earnings scenario="paused" />);

    expect(
      screen.getByText(/Payouts paused — £62\.40 being recovered/),
    ).toBeInTheDocument();
  });

  it("opens the payout drawer on the payouts tab", async () => {
    render(<Earnings tab="po" period="lastmonth" />);

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
    render(<Earnings open="export" />);
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
