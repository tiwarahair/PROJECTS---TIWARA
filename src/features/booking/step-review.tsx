import { cx } from "../../utils/class-names";
import { formatPence, formatPenceCompact } from "../../utils/money";
import type { PaymentPlan, ReviewSnapshot } from "../../types/booking";
import { BookingNav } from "./booking-nav";

/** Static in the original — the chosen day and time never fed into it. */
const FIXED_DATE_LABEL = "Fri 11 Jul, 1:30 pm";

export interface StepReviewProps {
  review: ReviewSnapshot;
  stylistName: string;
  onSelectPaymentPlan: (paymentPlan: PaymentPlan) => void;
  onBack: () => void;
  onNext: () => void;
}

export function StepReview({
  review: { service, colour, length, size, hairTexture, paymentPlan, money },
  stylistName,
  onSelectPaymentPlan,
  onBack,
  onNext,
}: StepReviewProps) {
  const payingInFull = paymentPlan === "full";

  return (
    <>
      <div className="bp-step-title">Review &amp; pay</div>
      <div className="bp-step-sub">
        {payingInFull
          ? "Confirm your booking by paying in full"
          : "Confirm your booking with a 25% deposit"}
      </div>

      <div className="bp-summary-card">
        <div className="bp-summary-label">Booking summary</div>
        <div className="bp-summary-row">
          <span>Service</span>
          <span>{service}</span>
        </div>
        <div className="bp-summary-row">
          <span>Colour</span>
          <span>{colour}</span>
        </div>
        <div className="bp-summary-row">
          <span>Length</span>
          <span>{length}</span>
        </div>
        {hairTexture && (
          <div className="bp-summary-row">
            <span>Hair texture</span>
            <span>{hairTexture}</span>
          </div>
        )}
        <div className="bp-summary-row">
          <span>Size</span>
          <span>{size}</span>
        </div>
        <div className="bp-summary-row">
          <span>Stylist</span>
          <span className="sum-stylist-name">{stylistName}</span>
        </div>
        <div className="bp-summary-row">
          <span>Date &amp; time</span>
          <span>{FIXED_DATE_LABEL}</span>
        </div>
        <div className="bp-summary-divider" />
        <div className="bp-summary-row">
          <span>Total</span>
          {/* Total has no decimals while deposit and balance always show two —
              the original formatted them separately and it is preserved. */}
          <span>{formatPenceCompact(money.total)}</span>
        </div>
        <div className="bp-summary-row bp-fee-row">
          <span>Platform fee (2%)</span>
          <span>{formatPence(money.fee)}</span>
        </div>

        <div className="bp-plan-toggle" role="group" aria-label="Payment plan">
          <button
            type="button"
            className={cx("bp-plan-opt", !payingInFull && "sel")}
            aria-pressed={!payingInFull}
            onClick={() => onSelectPaymentPlan("deposit")}
          >
            Pay 25% deposit
            <span className="sub">{formatPence(money.deposit)} now</span>
          </button>
          <button
            type="button"
            className={cx("bp-plan-opt", payingInFull && "sel")}
            aria-pressed={payingInFull}
            onClick={() => onSelectPaymentPlan("full")}
          >
            Pay in full
            <span className="sub">{formatPence(money.totalPlusFee)} now</span>
          </button>
        </div>

        <div className="bp-deposit-row">
          <span>{payingInFull ? "Due now (in full)" : "Due now (25%)"}</span>
          <span>{formatPence(money.dueNow)}</span>
        </div>
        <div className="bp-summary-row bp-summary-row-spaced">
          <span>Balance in salon</span>
          <span>{formatPence(money.balance)}</span>
        </div>
      </div>

      <div className="bp-policy-note">
        Deposits are non-refundable within 48 hours of your appointment. You can
        reschedule up to 48h before via the link in your confirmation email.
      </div>

      <BookingNav
        onBack={onBack}
        onNext={onNext}
        nextLabel={
          payingInFull ? "Pay in full & confirm →" : "Pay deposit & confirm →"
        }
        green
      />
    </>
  );
}
