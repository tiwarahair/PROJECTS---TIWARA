import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BusinessDetails } from "..";
import type { BusinessDetailsApi } from "..";
import type { BusinessPreset } from "../types";
import type { UserEvent } from "@testing-library/user-event";
import { setupUser } from "../../../test/setup-user";

let user: UserEvent;

const settle = () => act(() => vi.advanceTimersByTimeAsync(0));

beforeEach(() => {
  user = setupUser();
});

describe("BusinessDetails", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("renders the shop preset with saving disabled", () => {
    render(<BusinessDetails />);

    expect(
      screen.getByRole("radio", { name: /Shop \/ salon/ }),
    ).toHaveAttribute("aria-checked", "true");

    expect(
      screen.getByRole("heading", { name: "Salon address" }),
    ).toBeVisible();

    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  });

  it.each<[BusinessPreset, string]>([
    ["chair", "Salon address"],
    ["home", "Your address"],
    ["mobile", "Where you work"],
  ])("preset %s titles the location %s", (preset, heading) => {
    render(<BusinessDetails preset={preset} />);
    expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
  });

  it("presets vatValid / vatInvalid show the VAT result", async () => {
    const { unmount } = render(<BusinessDetails preset="vatValid" />);

    expect(screen.getByText("GB 312 4567 89")).toBeInTheDocument();
    unmount();
    render(<BusinessDetails preset="vatInvalid" />);
    await settle();

    expect(
      screen.getByText(
        "UK VAT numbers are 9 digits, or 12 for some businesses.",
      ),
    ).toBeInTheDocument();
  });

  it("preset pcError flags the address in the save bar", async () => {
    render(<BusinessDetails preset="pcError" />);
    await settle();

    expect(
      screen.getByText("Fix the highlighted field to save"),
    ).toBeInTheDocument();
  });

  it("preset unsaved saves, reports and shows the toast for 2.4s", async () => {
    const onSave = vi.fn();
    const onState = vi.fn<(api: BusinessDetailsApi) => void>();

    render(
      <BusinessDetails preset="unsaved" onSave={onSave} onState={onState} />,
    );

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

    render(<BusinessDetails preset="unsaved" onSave={onSave} />);
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

  it("switching to mobile drops the address error", async () => {
    render(<BusinessDetails preset="pcError" />);
    await settle();
    await user.click(screen.getByRole("radio", { name: /Mobile/ }));
    await settle();

    expect(
      screen.queryByText("Fix the highlighted field to save"),
    ).not.toBeInTheDocument();
  });

  it("the VAT number drops the GB prefix and letters while typing", async () => {
    render(<BusinessDetails preset="vatValid" />);
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

    render(<BusinessDetails tax={null} onEditTax={onEditTax} />);
    await user.click(screen.getByRole("button", { name: "Add tax details" }));
    expect(onEditTax).toHaveBeenCalled();
  });
});
