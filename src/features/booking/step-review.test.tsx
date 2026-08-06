import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StepReview } from "./step-review";
import type { PaymentPlan, ReviewSnapshot } from "../../types/booking";

const noop = () => {};

/** Cornrows at £60: total 6000p, fee 120p, deposit 1500p. */
const review = (paymentPlan: PaymentPlan = "deposit"): ReviewSnapshot => {
  const dueNow = paymentPlan === "full" ? 6000 : 1500;
  return {
    service: "Cornrows",
    colour: "1B Natural Black",
    length: 'Shoulder (14"-18")',
    size: "Medium",
    hairTexture: null,
    paymentPlan,
    money: {
      total: 6000,
      fee: 120,
      deposit: 1500,
      dueNow,
      balance: 6000 - dueNow,
    },
  };
};

const renderStep = (props: Partial<Parameters<typeof StepReview>[0]> = {}) =>
  render(
    <StepReview
      review={review()}
      stylistName="Tiwara's House"
      onSelectPaymentPlan={noop}
      onBack={noop}
      onNext={noop}
      {...props}
    />,
  );

describe("StepReview", () => {
  it("renders without crashing", () => {
    renderStep();
    expect(screen.getByText("Cornrows")).toBeInTheDocument();
  });

  it("formats the money rows from integer pence", () => {
    renderStep();

    expect(screen.getByText("£60")).toBeInTheDocument(); // total, no decimals
    expect(screen.getByText("£1.20")).toBeInTheDocument(); // 2% fee
    expect(screen.getByText("£15.00")).toBeInTheDocument(); // deposit due now
    expect(screen.getByText("£45.00")).toBeInTheDocument(); // balance
  });

  it("omits the hair texture row unless the service collects one", () => {
    renderStep();
    expect(screen.queryByText("Hair texture")).toBeNull();

    renderStep({
      review: { ...review(), hairTexture: "Kinky Curly" },
    });
    expect(screen.getByText("Hair texture")).toBeInTheDocument();
    expect(screen.getByText("Kinky Curly")).toBeInTheDocument();
  });

  describe("the payment plan toggle", () => {
    it("marks the deposit option as chosen by default", () => {
      renderStep();

      expect(
        screen.getByRole("button", { name: /Pay 25% deposit/ }),
      ).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByText("Due now (25%)")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Pay deposit & confirm →" }),
      ).toBeInTheDocument();
    });

    it("reports a switch to paying in full", async () => {
      const onSelectPaymentPlan = vi.fn();
      renderStep({ onSelectPaymentPlan });

      await userEvent.click(
        screen.getByRole("button", { name: /Pay in full/ }),
      );
      expect(onSelectPaymentPlan).toHaveBeenCalledWith("full");
    });

    it("charges the whole total and clears the balance on the full plan", () => {
      renderStep({ review: review("full") });

      expect(screen.getByText("Due now (in full)")).toBeInTheDocument();
      expect(screen.getByText("£60.00")).toBeInTheDocument(); // due now
      expect(screen.getByText("£0.00")).toBeInTheDocument(); // balance
      expect(
        screen.getByRole("button", { name: "Pay in full & confirm →" }),
      ).toBeInTheDocument();
    });
  });
});
