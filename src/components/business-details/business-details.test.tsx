import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BusinessDetails } from "./business-details";
import type { BusinessDetailsApi } from "./business-details";
import { getAreaLabel, formatVatNumber } from "./business-details-logic";
import type { BusinessPreset } from "./business-details-logic";

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

  it("presets vatValid / vatInvalid show the VAT result", () => {
    const { unmount } = render(<BusinessDetails preset="vatValid" />);
    expect(screen.getByText("GB 312 4567 89")).toBeInTheDocument();
    unmount();
    render(<BusinessDetails preset="vatInvalid" />);
    expect(
      screen.getByText(
        "UK VAT numbers are 9 digits, or 12 for some businesses.",
      ),
    ).toBeInTheDocument();
  });

  it("preset pcError flags the address in the save bar", () => {
    render(<BusinessDetails preset="pcError" />);
    expect(
      screen.getByText("Fix the highlighted field to save"),
    ).toBeInTheDocument();
  });

  it("preset unsaved saves, reports and shows the toast for 2.4s", () => {
    const onSave = vi.fn();
    const onState = vi.fn<(api: BusinessDetailsApi) => void>();
    render(
      <BusinessDetails preset="unsaved" onSave={onSave} onState={onState} />,
    );
    expect(onState.mock.lastCall?.[0].canSave).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "shop",
        v: expect.objectContaining({ phone: "07700 900512", pc: "M14 5AJ" }),
      }),
    );
    expect(onState.mock.lastCall?.[0].canSave).toBe(false);
    expect(screen.getByRole("status")).toHaveClass(/toastShown/);
    act(() => vi.advanceTimersByTime(2400));
    expect(screen.getByRole("status")).toHaveClass(/toastHidden/);
  });

  it("without tax details offers to add them", () => {
    const onEditTax = vi.fn();
    render(<BusinessDetails tax={null} onEditTax={onEditTax} />);
    fireEvent.click(screen.getByRole("button", { name: "Add tax details" }));
    expect(onEditTax).toHaveBeenCalled();
  });

  it("labels the home area and formats VAT numbers", () => {
    expect(getAreaLabel("M14 5TQ")).toBe("Rusholme, M14");
    expect(getAreaLabel("M1 5QA")).toBe("M1");
    expect(getAreaLabel("M14")).toBe("Add your postcode to see your area");
    // same postcode rules as every other form
    expect(getAreaLabel("m14-5tq")).toBe("Rusholme, M14");
    expect(formatVatNumber("312456789012")).toBe("GB 312 4567 89 012");
  });
});
