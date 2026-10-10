import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TaxDetailsForm } from "./tax-details-form";
import type { TaxFixture } from "./tax-details-logic";
import {
  formatNiNumber,
  getInitialTaxState,
  getTaxErrors,
} from "./tax-details-logic";

describe("TaxDetailsForm", () => {
  it("renders the sole-trader form by default", () => {
    render(<TaxDetailsForm />);
    expect(
      screen.getByRole("radio", { name: "Sole trader / self-employed" }),
    ).toHaveAttribute("aria-checked", "true");
    expect(
      screen.getByText("Is Amara Okonkwo your legal name?"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Continue to Stripe" }),
    ).toBeInTheDocument();
  });

  it.each<[TaxFixture, string]>([
    ["err-empty", "Enter your date of birth"],
    ["err-initials", "Enter your full name, not initials."],
    ["err-dob", "Enter a real date of birth."],
    ["err-under18", "You must be 18 or over to receive payouts."],
    ["err-ni", "Enter a National Insurance number like QQ 12 34 56 C."],
    ["err-conum", "Enter your 8-character company registration number."],
  ])("fixture %s shows its error", (fixture, message) => {
    render(<TaxDetailsForm fixture={fixture} />);
    expect(screen.getAllByText(message)[0]).toBeInTheDocument();
  });

  it("fixtures name-no and ltd open their fields", () => {
    const { unmount } = render(<TaxDetailsForm fixture="name-no" />);
    expect(screen.getByLabelText("Legal first name")).toBeInTheDocument();
    unmount();
    render(<TaxDetailsForm fixture="ltd" />);
    expect(screen.getByLabelText("Company name")).toHaveValue(
      "Amara Beauty Ltd",
    );
  });

  it("accepts postcodes typed with punctuation, like every other form", () => {
    const state = getInitialTaxState({ fixture: "err-pc" });
    state.home.a.pc = "m14-5tq";
    expect(getTaxErrors(state).addr).toBeUndefined();
  });

  it("fixture err-pc flags the address", () => {
    expect(getTaxErrors(getInitialTaxState({ fixture: "err-pc" })).addr).toBe(
      "Enter your home address",
    );
  });

  it("submits a limited company with the business address", () => {
    const onSubmit = vi.fn();
    render(
      <TaxDetailsForm
        mode="settings"
        fixture="ltd"
        business={{
          type: "chair",
          v: { line1: "48 Oxford Road", city: "Manchester", pc: "M1 5QA" },
        }}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.change(screen.getByLabelText("Company registration number"), {
      target: { value: "sc123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "ltd",
        coNum: "SC123456",
        addrSame: true,
        addr: {
          line1: "48 Oxford Road",
          line2: "",
          city: "Manchester",
          pc: "M1 5QA",
        },
      }),
    );
  });

  it("formats the NI number as you type", () => {
    expect(formatNiNumber("qq123456c")).toBe("QQ 12 34 56 C");
    expect(formatNiNumber("QQ12")).toBe("QQ 12");
  });
});
