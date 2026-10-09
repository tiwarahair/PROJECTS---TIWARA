import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PaymentPolicy } from "./payment-policy";
import type { PaymentPolicyApi } from "./payment-policy";
import {
  getInitialPolicyState,
  getPolicySummary,
} from "./payment-policy-logic";
import type { PolicyPreset } from "./payment-policy-logic";

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
    expect(getPolicySummary(getInitialPolicyState(preset))).toBe(summary);
  });

  it("preset error blocks saving", () => {
    render(<PaymentPolicy preset="error" />);
    expect(
      screen.getByText(
        "Non-refundable deposits can be up to 25%. Lower it or make it refundable.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Fix the error to save")).toBeInTheDocument();
  });

  it("preset unsaved saves, reports to the host and flashes Saved", () => {
    const onSave = vi.fn();
    const onState = vi.fn<(api: PaymentPolicyApi) => void>();
    render(
      <PaymentPolicy preset="unsaved" onSave={onSave} onState={onState} />,
    );
    expect(onState.mock.lastCall?.[0].canSave).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Save policy" }));
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

  it("caps additional policies at 300 characters in total", () => {
    render(<PaymentPolicy />);
    fireEvent.click(screen.getByRole("button", { name: "Add custom policy" }));
    fireEvent.change(screen.getByLabelText("Custom policy"), {
      target: { value: "x".repeat(320) },
    });
    expect(screen.getByText("Limit reached, 300 / 300")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add preparation note" }),
    ).toBeDisabled();
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
