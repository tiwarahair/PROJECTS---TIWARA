import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PaymentPolicy } from "..";
import type { PaymentPolicyApi } from "..";
import { getPolicySummary } from "../summary";
import type { PolicyPreset } from "../types";
import { getInitialPolicy } from "../values";
import type { UserEvent } from "@testing-library/user-event";
import { setupUser } from "../../../test/setup-user";

let user: UserEvent;

const settle = () => act(() => vi.advanceTimersByTimeAsync(0));

beforeEach(() => {
  user = setupUser();
});

describe("PaymentPolicy", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("renders the deposit default with the £100 preview", () => {
    render(<PaymentPolicy />);

    expect(screen.getByRole("radio", { name: /Deposit/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    expect(screen.getByText("£22")).toBeInTheDocument();

    expect(
      screen.getByText(
        "20% deposit, free cancellation until 48h before, no fees",
      ),
    ).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Save policy" })).toBeDisabled();
  });

  it.each<[PolicyPreset, string]>([
    [
      "full",
      "Full payment upfront, free cancellation until 48h before, no fees",
    ],
    [
      "card",
      "Card saved at booking, free cancellation until 48h before, no fees",
    ],
    ["none", "No protection, cancel by 48h before"],
    [
      "unsaved",
      "25% deposit, free cancellation until 48h before, 50% late cancellation fee, deposit kept for no-shows",
    ],
  ])("preset %s summarises the policy", (preset, summary) => {
    expect(getPolicySummary(getInitialPolicy(preset).values)).toBe(summary);
  });

  it("preset error blocks saving", async () => {
    render(<PaymentPolicy preset="error" />);
    await settle();

    expect(
      screen.getByText(
        "Non-refundable deposits can be up to 25%. Lower it or make it refundable.",
      ),
    ).toBeInTheDocument();

    expect(screen.getByText("Fix the error to save")).toBeInTheDocument();
  });

  it("preset unsaved saves, reports to the host and flashes Saved", async () => {
    const onSave = vi.fn();
    const onState = vi.fn<(api: PaymentPolicyApi) => void>();

    render(
      <PaymentPolicy preset="unsaved" onSave={onSave} onState={onState} />,
    );

    expect(onState.mock.lastCall?.[0].canSave).toBe(true);
    await settle();
    await user.click(screen.getByRole("button", { name: "Save policy" }));
    await settle();

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "deposit",
        deposit: 25,
        extras: [
          {
            type: "prep",
            text: "Please arrive with clean, product-free hair.",
          },
        ],
      }),
    );

    expect(screen.getByRole("button", { name: "Saved" })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1800));
    expect(screen.getByRole("button", { name: "Save policy" })).toBeDisabled();
  });

  it("stays unsaved when the host holds the save", async () => {
    render(
      <PaymentPolicy preset="unsaved" onSave={() => Promise.resolve(false)} />,
    );

    await user.click(screen.getByRole("button", { name: "Save policy" }));

    expect(screen.getByRole("button", { name: "Save policy" })).toBeEnabled();
  });

  it("caps additional policies at 300 characters in total", async () => {
    render(<PaymentPolicy />);
    await user.click(screen.getByRole("button", { name: "Add custom policy" }));

    await user.type(screen.getByLabelText("Custom policy"), "x".repeat(320));

    expect(screen.getByText("Limit reached, 300 / 300")).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Add preparation note" }),
    ).toBeDisabled();
  });

  it("focuses a new additional policy and removes it again", async () => {
    render(<PaymentPolicy />);

    await user.click(
      screen.getByRole("button", { name: "Add preparation note" }),
    );

    expect(screen.getByLabelText("Preparation note")).toHaveFocus();

    await user.click(
      screen.getByRole("button", { name: "Remove preparation note" }),
    );

    expect(screen.queryByLabelText("Preparation note")).not.toBeInTheDocument();
  });

  it("clears the deposit error once the deposit is made refundable", async () => {
    render(<PaymentPolicy preset="error" />);
    await settle();

    await user.click(
      screen.getByRole("radio", { name: /Refundable according/ }),
    );

    await settle();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save policy" })).toBeEnabled();
  });

  it("typing a fee percentage switches the fee to a charge", async () => {
    render(<PaymentPolicy />);
    await user.click(screen.getByRole("checkbox", { name: "No-show fee" }));

    const percent = screen.getByLabelText("No-show fee percentage of service");

    await user.clear(percent);
    await user.type(percent, "3a0");

    expect(percent).toHaveValue("30");

    expect(
      screen.getByRole("radio", { name: /Keep the deposit/ }),
    ).toHaveAttribute("aria-checked", "false");
  });

  it("says how many existing bookings keep their policy", () => {
    render(<PaymentPolicy bookingsCount={1} />);

    expect(
      screen.getByText(
        "This applies to new bookings only. Your 1 existing booking keeps its current policy.",
      ),
    ).toBeInTheDocument();
  });
});
