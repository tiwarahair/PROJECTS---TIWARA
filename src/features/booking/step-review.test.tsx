import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StepReview } from "./step-review";
import type { PaymentPlan, ReviewSnapshot } from "../../types/booking";

const noop = () => {};

/** Cornrows at £60: total 6000p, 2% fee 120p, so 6120p to settle. The deposit
 *  is 25% of that, 1530p. */
const TOTAL = 6000;
const FEE = 120;
const TOTAL_PLUS_FEE = TOTAL + FEE;
const DEPOSIT = 1530;

const review = (paymentPlan: PaymentPlan = "deposit"): ReviewSnapshot => {
  const dueNow = paymentPlan === "full" ? TOTAL_PLUS_FEE : DEPOSIT;
  return {
    service: "Cornrows",
    colour: "1B Natural Black",
    length: 'Shoulder (14"-18")',
    size: "Medium",
    hairTexture: null,
    paymentPlan,
    money: {
      total: TOTAL,
      totalPlusFee: TOTAL_PLUS_FEE,
      fee: FEE,
      deposit: DEPOSIT,
      dueNow,
      balance: TOTAL_PLUS_FEE - dueNow,
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
    expect(screen.getAllByText("£15.30").length).toBeGreaterThan(0); // deposit
    expect(screen.getByText("£45.90")).toBeInTheDocument(); // balance
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
      // Total plus the 2% fee, not the bare total.
      expect(screen.getAllByText("£61.20").length).toBeGreaterThan(0);
      expect(screen.getByText("£0.00")).toBeInTheDocument(); // balance
      expect(
        screen.getByRole("button", { name: "Pay in full & confirm →" }),
      ).toBeInTheDocument();
    });
  });
});
