import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StepStyle } from "./step-style";
import { renderWithRouter } from "../../test/helpers";
import { findStylist } from "../../data/stylist/stylist";

const noop = () => {};

/** StepStyle reaches for the store to open the custom-style modal. */
const renderStep = (props: Partial<Parameters<typeof StepStyle>[0]> = {}) =>
  renderWithRouter(
    <StepStyle
      serviceId="braids"
      stylistId={null}
      selectedStyleId={null}
      onSelectStyle={noop}
      onBack={noop}
      {...props}
    />,
  );

describe("StepStyle", () => {
  it("lists the catalogue when no stylist is chosen", () => {
    renderStep();

    expect(screen.getByText("Knotless Braids")).toBeInTheDocument();
    expect(screen.getByText("Cornrows")).toBeInTheDocument();
  });

  // Amara offers wigs, not braids, so there is nothing of hers to list here.
  it("lists only the styles the stylist offers", () => {
    renderStep({ stylistId: "amara", serviceId: "wigs" });

    expect(screen.getByText("Lace Frontal Install")).toBeInTheDocument();
    expect(screen.queryByText("Knotless Braids")).toBeNull();
  });

  it("prices each style at the stylist's own rate", () => {
    renderStep({ stylistId: "tiwara" });

    const { price } = findStylist("tiwara")!.services.braids.knotless!;
    expect(screen.getByText(`from ${price}`)).toBeInTheDocument();
  });

  // Auto-advance means no Continue, but Back is the only route to the service
  // step from inside the flow.
  it("offers a Back button", async () => {
    const onBack = vi.fn();
    renderStep({ onBack });

    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(onBack).toHaveBeenCalled();
  });
});
