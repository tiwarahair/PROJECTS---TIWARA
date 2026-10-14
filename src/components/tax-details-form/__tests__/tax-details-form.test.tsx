import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaxDetailsForm } from "../tax-details-form";
import type { TaxFixture } from "../tax-details-logic";
import {
  formatNationalInsuranceNumber,
  getInitialTaxState,
  getTaxErrors,
  getTaxOutput,
} from "../tax-details-logic";
import type { UserEvent } from "@testing-library/user-event";
import { setupUser } from "../../../test/setup-user";

let user: UserEvent;

beforeEach(() => {
  user = setupUser();
});

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
      "Tiwára's House Ltd",
    );
  });

  it("accepts postcodes typed with punctuation, like every other form", () => {
    const state = getInitialTaxState({ fixture: "err-pc" });

    state.home.fields.postcode = "m14-5tq";
    expect(getTaxErrors(state).address).toBeUndefined();
  });

  it("drops names typed before choosing the account name", () => {
    const state = {
      ...getInitialTaxState({ fixture: "name-no" }),
      first: "Old",
      last: "Name",
      nameYes: true,
    };

    expect(getTaxOutput(state, "Amara Okonkwo")).toMatchObject({
      first: "",
      middle: "",
      last: "",
      legalName: "Amara Okonkwo",
    });
  });

  it("fixture err-pc flags the address", () => {
    expect(
      getTaxErrors(getInitialTaxState({ fixture: "err-pc" })).address,
    ).toBe("Enter your home address");
  });

  it("submits a limited company with the business address", async () => {
    const onSubmit = vi.fn();

    render(
      <TaxDetailsForm
        mode="settings"
        fixture="ltd"
        business={{
          type: "chair",
          details: {
            line1: "48 Oxford Road",
            city: "Manchester",
            postcode: "M1 5QA",
          },
        }}
        onSubmit={onSubmit}
      />,
    );

    await user.type(
      screen.getByLabelText("Company registration number"),
      "sc123456",
    );

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "ltd",
        companyNumber: "SC123456",
        isAddressSame: true,
        address: {
          line1: "48 Oxford Road",
          line2: "",
          city: "Manchester",
          postcode: "M1 5QA",
        },
      }),
    );
  });

  it("formats the NI number as you type", () => {
    expect(formatNationalInsuranceNumber("qq123456c")).toBe("QQ 12 34 56 C");
    expect(formatNationalInsuranceNumber("QQ12")).toBe("QQ 12");
  });
});
