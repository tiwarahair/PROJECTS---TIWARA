import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BusinessDetails } from "..";
import type { BusinessDetailsApi } from "..";
import type { BusinessValue } from "../types";
import type { UserEvent } from "@testing-library/user-event";
import { setupUser } from "../../../test/setup-user";

let user: UserEvent;

const business: BusinessValue = {
  type: "shop",
  vatOn: false,
  details: {
    line1: "118 Wilmslow Road",
    line2: "Unit 4",
    city: "Manchester",
    postcode: "M14 5AJ",
    basePostcode: "",
    radius: "10",
    phone: "07700 900418",
    email: "info@tiwarashouse.com",
    vat: "",
  },
};

const settle = () => act(() => vi.advanceTimersByTimeAsync(0));

beforeEach(() => {
  user = setupUser();
});

describe("BusinessDetails", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("renders the saved details with saving disabled", () => {
    render(<BusinessDetails value={business} tax={null} />);

    expect(
      screen.getByRole("radio", { name: /Shop \/ salon/ }),
    ).toHaveAttribute("aria-checked", "true");

    expect(
      screen.getByRole("heading", { name: "Salon address" }),
    ).toBeVisible();

    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  });

  it("saves an edit, reports and shows the toast for 2.4s", async () => {
    const onSave = vi.fn();
    const onState = vi.fn<(api: BusinessDetailsApi) => void>();

    render(
      <BusinessDetails
        value={business}
        tax={null}
        onSave={onSave}
        onState={onState}
      />,
    );

    const phone = screen.getByLabelText("Business phone");

    await user.clear(phone);
    await user.type(phone, "07700 900512");
    expect(onState.mock.lastCall?.[0].canSave).toBe(true);
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await settle();

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "shop",
        details: expect.objectContaining({
          phone: "07700 900512",
          postcode: "M14 5AJ",
        }),
      }),
    );

    expect(onState.mock.lastCall?.[0].canSave).toBe(false);
    expect(screen.getByRole("status")).toHaveClass(/toastShown/);
    act(() => vi.advanceTimersByTime(2400));
    expect(screen.getByRole("status")).toHaveClass(/toastHidden/);
  });

  it("saving without a phone or email flags both until one is filled", async () => {
    const onSave = vi.fn();

    render(<BusinessDetails value={business} tax={null} onSave={onSave} />);
    await settle();
    await user.clear(screen.getByLabelText("Business phone"));
    await user.clear(screen.getByLabelText("Business email"));
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await settle();

    expect(onSave).not.toHaveBeenCalled();

    expect(
      screen.getByText("Fix the 2 highlighted fields to save"),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText("Business phone"), "07700 900418");
    await settle();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("the VAT number drops the GB prefix and letters while typing", async () => {
    render(<BusinessDetails value={{ ...business, vatOn: true }} tax={null} />);
    const vat = screen.getByLabelText("VAT number");

    await user.clear(vat);
    await user.type(vat, "3a1");
    expect(vat).toHaveValue("31");
    await user.clear(vat);
    await user.paste("GB 312 4567 89");

    expect(vat).toHaveValue("312 4567 89");
  });

  it("without tax details offers to add them", async () => {
    const onEditTax = vi.fn();

    render(
      <BusinessDetails value={business} tax={null} onEditTax={onEditTax} />,
    );

    await user.click(screen.getByRole("button", { name: "Add tax details" }));
    expect(onEditTax).toHaveBeenCalled();
  });
});
