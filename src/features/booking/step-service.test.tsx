import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StepService } from "./step-service";
import { SERVICES } from "../../data/services/services";

const noop = () => {};

describe("StepService", () => {
  it("renders every service when no stylist is chosen", () => {
    render(
      <StepService
        stylistId={null}
        selectedServiceId={null}
        onSelectService={noop}
      />,
    );

    expect(screen.getByText("Choose your service")).toBeInTheDocument();
    for (const { label } of SERVICES) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  // Amara offers wigs, natural hair and treatments — no braids, no locs.
  it("shows only what the stylist offers, and says whose list it is", () => {
    render(
      <StepService
        stylistId="amara"
        stylistName="Amara Beauty"
        selectedServiceId={null}
        onSelectService={noop}
      />,
    );

    expect(screen.getByText("Wig Installs")).toBeInTheDocument();
    expect(screen.queryByText("Braids & Protective Styles")).toBeNull();
    expect(
      screen.getByText(/3 services from Amara Beauty/),
    ).toBeInTheDocument();
  });

  it("reports the service that was clicked", async () => {
    const onSelectService = vi.fn();
    render(
      <StepService
        stylistId={null}
        selectedServiceId={null}
        onSelectService={onSelectService}
      />,
    );

    await userEvent.click(screen.getByText("Wig Installs"));
    expect(onSelectService).toHaveBeenCalledWith("wigs");
  });

  it("marks the chosen service as selected", () => {
    const { container } = render(
      <StepService
        stylistId={null}
        selectedServiceId="locs"
        onSelectService={noop}
      />,
    );

    expect(container.querySelector("#svc-locs")).toHaveClass("selected");
  });

  // The service step is the first one, so there is nothing behind it to reach.
  it("offers no Back of its own", () => {
    const { container } = render(
      <StepService
        stylistId={null}
        selectedServiceId={null}
        onSelectService={noop}
      />,
    );

    expect(container.querySelector(".bp-btn-back")).toBeNull();
  });
});
