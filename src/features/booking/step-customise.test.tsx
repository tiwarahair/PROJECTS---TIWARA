import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StepCustomise } from "./step-customise";
import { renderWithRouter } from "../../test/helpers";

const noop = () => {};

/** StepCustomise reaches for the store to open the size-guide modal. */
const renderStep = (props: Partial<Parameters<typeof StepCustomise>[0]> = {}) =>
  renderWithRouter(
    <StepCustomise
      serviceId="braids"
      colourId="1B"
      lengthId="shoulder"
      hairTextureId="straight"
      size="Medium"
      addOnIds={[]}
      onSelectColour={noop}
      onSelectLength={noop}
      onSelectHairTexture={noop}
      onSelectSize={noop}
      onToggleAddOn={noop}
      onBack={noop}
      onNext={noop}
      {...props}
    />,
  );

describe("StepCustomise", () => {
  it("renders without crashing", () => {
    renderStep();
    expect(screen.getByText("Customise your look")).toBeInTheDocument();
  });

  describe("hair texture", () => {
    // Every group is hidden rather than unmounted, so presence alone is not
    // the question — visibility is.
    it("is hidden for a service that does not collect one", () => {
      renderStep({ serviceId: "braids" });
      expect(screen.getByText("Hair texture")).not.toBeVisible();
    });

    it("is shown for Wig Installs", () => {
      renderStep({ serviceId: "wigs" });
      expect(screen.getByText("Hair texture")).toBeVisible();
      expect(screen.getByText("Kinky Curly")).toBeVisible();
    });

    it("reports the chosen texture by id", async () => {
      const onSelectHairTexture = vi.fn();
      renderStep({ serviceId: "wigs", onSelectHairTexture });

      await userEvent.click(screen.getByText("Deep Wave"));
      expect(onSelectHairTexture).toHaveBeenCalledWith("deep-wave");
    });
  });

  describe("length", () => {
    it("reports the chosen length by id, not by position", async () => {
      const onSelectLength = vi.fn();
      renderStep({ onSelectLength });

      await userEvent.click(screen.getByText("Waist / bum"));
      expect(onSelectLength).toHaveBeenCalledWith("waist");
    });
  });

  describe("add-ons", () => {
    it("prices each add-on in pounds from its stored pence", () => {
      renderStep({ serviceId: "braids" });
      // Boho curls is stored as 1500 pence.
      expect(screen.getByText("+£15")).toBeInTheDocument();
    });
  });
});
