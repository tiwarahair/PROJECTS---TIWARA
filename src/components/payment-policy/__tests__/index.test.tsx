import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PaymentPolicy } from "..";
import type { PolicyValue } from "../types";
import type { UserEvent } from "@testing-library/user-event";
import { setupUser } from "../../../test/setup-user";

let user: UserEvent;

const policy: PolicyValue = {
  mode: "deposit",
  deposit: 20,
  refundable: true,
  window: 48,
  grace: 0,
  late: { on: false, kind: "keep", percent: 50 },
  noShow: { on: false, kind: "keep", percent: 50 },
  extras: [],
};

const settle = () => act(() => vi.advanceTimersByTimeAsync(0));

beforeEach(() => {
  user = setupUser();
});

describe("PaymentPolicy", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("renders the saved policy with the £100 preview", () => {
    render(<PaymentPolicy stylistName="Crown & Coil" value={policy} />);

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

  it("blocks saving a non-refundable deposit over 25%", async () => {
    render(
      <PaymentPolicy
        stylistName="Crown & Coil"
        value={{ ...policy, deposit: 40, refundable: false }}
      />,
    );

    await settle();

    expect(
      screen.getByText(
        "Non-refundable deposits can be up to 25%. Lower it or make it refundable.",
      ),
    ).toBeInTheDocument();

    expect(screen.getByText("Fix the error to save")).toBeInTheDocument();
  });

  it("caps additional policies at 300 characters in total", async () => {
    render(<PaymentPolicy stylistName="Crown & Coil" value={policy} />);
    await user.click(screen.getByRole("button", { name: "Add custom policy" }));

    await user.type(screen.getByLabelText("Custom policy"), "x".repeat(320));

    expect(screen.getByText("Limit reached, 300 / 300")).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Add preparation note" }),
    ).toBeDisabled();
  });

  it("focuses a new additional policy and removes it again", async () => {
    render(<PaymentPolicy stylistName="Crown & Coil" value={policy} />);

    await user.click(
      screen.getByRole("button", { name: "Add preparation note" }),
    );

    expect(screen.getByLabelText("Preparation note")).toHaveFocus();

    await user.click(
      screen.getByRole("button", { name: "Remove preparation note" }),
    );

    expect(screen.queryByLabelText("Preparation note")).not.toBeInTheDocument();
  });

  it("typing a fee percentage switches the fee to a charge", async () => {
    render(<PaymentPolicy stylistName="Crown & Coil" value={policy} />);
    await user.click(screen.getByRole("checkbox", { name: "No-show fee" }));

    const percent = screen.getByLabelText("No-show fee percentage of service");

    await user.clear(percent);
    await user.type(percent, "3a0");

    expect(percent).toHaveValue("30");

    expect(
      screen.getByRole("radio", { name: /Keep the deposit/ }),
    ).toHaveAttribute("aria-checked", "false");
  });

  it("keeps edits made while a save is still pending", async () => {
    let finish: (isSaved: boolean) => void = () => {};

    render(
      <PaymentPolicy
        stylistName="Crown & Coil"
        value={policy}
        onSave={() =>
          new Promise<boolean>((resolve) => {
            finish = resolve;
          })
        }
      />,
    );

    const deposit = screen.getByLabelText("Deposit amount");

    await user.clear(deposit);
    await user.type(deposit, "30");
    await settle();
    await user.click(screen.getByRole("button", { name: "Save policy" }));
    await settle();
    await user.clear(deposit);
    await user.type(deposit, "35");
    await act(async () => finish(true));
    await settle();

    expect(deposit).toHaveValue("35");
    expect(screen.getByRole("button", { name: /Save/ })).toBeEnabled();
  });

  it("keeps the cursor in an additional policy while a save finishes", async () => {
    let finish: (isSaved: boolean) => void = () => {};

    render(
      <PaymentPolicy
        stylistName="Crown & Coil"
        value={{ ...policy, extras: [{ type: "prep", text: "Clean hair" }] }}
        onSave={() =>
          new Promise<boolean>((resolve) => {
            finish = resolve;
          })
        }
      />,
    );

    const note = screen.getByLabelText("Preparation note");

    await user.type(note, " please");
    await settle();
    await user.click(screen.getByRole("button", { name: "Save policy" }));
    await settle();
    await user.click(note);
    await user.type(note, ".");
    await act(async () => finish(true));
    await settle();

    expect(note).toBeInTheDocument();
    expect(note).toHaveFocus();
    expect(note).toHaveValue("Clean hair please.");
  });

  it("says how many existing bookings keep their policy", () => {
    render(
      <PaymentPolicy
        stylistName="Crown & Coil"
        value={policy}
        bookingsCount={1}
      />,
    );

    expect(
      screen.getByText(
        "This applies to new bookings only. Your 1 existing booking keeps its current policy.",
      ),
    ).toBeInTheDocument();
  });
});
