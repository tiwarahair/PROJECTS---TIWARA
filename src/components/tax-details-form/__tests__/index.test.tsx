import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaxDetailsForm } from "..";
import {
  formatNationalInsuranceNumber,
  getInitialTax,
  getTaxOutput,
} from "../logic";
import { getTaxSchema } from "../schema";
import type { UserEvent } from "@testing-library/user-event";
import { setupUser } from "../../../test/setup-user";

let user: UserEvent;

const names = { legalName: "Amara Okonkwo", businessName: "Crown & Coil Ltd" };

beforeEach(() => {
  user = setupUser();
});

describe("TaxDetailsForm", () => {
  it("renders the sole-trader form by default", () => {
    render(<TaxDetailsForm {...names} />);

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

  it("date of birth boxes are labelled for screen readers, with no visible DD / MM / YYYY headings", () => {
    render(<TaxDetailsForm {...names} />);

    expect(screen.getByLabelText("Day")).toHaveAttribute("placeholder", "DD");
    expect(screen.getByLabelText("Month")).toHaveAttribute("placeholder", "MM");

    expect(screen.getByLabelText("Year")).toHaveAttribute(
      "placeholder",
      "YYYY",
    );

    expect(screen.queryByText("DD")).not.toBeInTheDocument();
    expect(screen.queryByText("YYYY")).not.toBeInTheDocument();
  });

  it("accepts postcodes typed with punctuation, like every other form", () => {
    const { values } = getInitialTax({ businessName: "" });

    values.home = {
      same: false,
      src: "manual",
      fields: {
        line1: "12 Dickenson Road",
        line2: "",
        city: "Manchester",
        postcode: "m14-5tq",
      },
    };

    expect(
      getTaxSchema("")
        .safeParse(values)
        .error?.issues.some(({ path }) => path.join(".") === "home.fields"),
    ).toBe(false);
  });

  it("drops names typed before choosing the account name", () => {
    const state = {
      ...getInitialTax({ businessName: "" }).values,
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

  it("checks every field on submit and doesn't send an invalid form", async () => {
    const onSubmit = vi.fn();

    render(<TaxDetailsForm {...names} onSubmit={onSubmit} />);

    await user.click(
      screen.getByRole("button", { name: "Continue to Stripe" }),
    );

    expect(
      await screen.findByText("Enter your date of birth"),
    ).toBeInTheDocument();

    expect(
      screen.getByText("Enter your National Insurance number"),
    ).toBeInTheDocument();

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("a saved NI number can be left blank", () => {
    const { values } = getInitialTax({
      businessName: "",
      value: { kind: "sole", nationalInsuranceHint: "QQ •• •• 56 C" },
    });

    const paths = (hint: string) =>
      getTaxSchema(hint)
        .safeParse(values)
        .error?.issues.map(({ path }) => path.join("."));

    expect(paths("QQ •• •• 56 C")).not.toContain("nationalInsuranceNumber");
    expect(paths("")).toContain("nationalInsuranceNumber");
  });

  it("submits a limited company with the business address", async () => {
    const onSubmit = vi.fn();

    render(
      <TaxDetailsForm
        {...names}
        mode="settings"
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

    await user.click(screen.getByRole("radio", { name: "Limited company" }));

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

  it("reports unsaved changes, and none once they're undone", async () => {
    const onDirtyChange = vi.fn();

    render(
      <TaxDetailsForm
        {...names}
        mode="settings"
        onDirtyChange={onDirtyChange}
      />,
    );

    const year = screen.getByLabelText("Year");

    await user.type(year, "1990");
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);

    await user.clear(year);
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
  });

  it("formats the NI number as you type", () => {
    expect(formatNationalInsuranceNumber("qq123456c")).toBe("QQ 12 34 56 C");
    expect(formatNationalInsuranceNumber("QQ12")).toBe("QQ 12");
  });
});
