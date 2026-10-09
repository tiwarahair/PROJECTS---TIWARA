import { joinClassNames } from "../../utils/class-names";
import helmet from "./booking-helmet.module.css";
import next from "./next-button.module.css";
import styles from "./step-nav.module.css";
import type { BookingController } from "./use-booking";

interface StepNavProps {
  booking: BookingController;
}

/** Desktop Back / Continue under each step (hidden under 960px, where the mobile bar takes over). */
export const StepNav = ({ booking }: StepNavProps) => {
  const { state, nextDisabled, actions } = booking;
  const { step } = state;
  return (
    <div className={joinClassNames(helmet.navbtns, styles.row)}>
      {step > 1 && step < 6 && (
        <button
          onClick={actions.goBack}
          aria-label="Back"
          className={styles.back}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5"></path>
            <path d="m12 19-7-7 7-7"></path>
          </svg>
        </button>
      )}
      {step >= 2 && step < 6 && (
        <button
          onClick={actions.goNext}
          disabled={nextDisabled}
          className={joinClassNames(
            next.desktop,
            nextDisabled ? next.disabled : next.enabled,
          )}
        >
          {step === 5 ? "Continue to payment" : "Continue"}
        </button>
      )}
    </div>
  );
};
