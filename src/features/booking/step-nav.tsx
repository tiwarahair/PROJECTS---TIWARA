import { ArrowLeft } from "lucide-react";
import { joinClassNames } from "../../utils/class-names";
import pageGlobal from "../../styles/features/booking/page-global.module.css";
import next from "../../styles/features/booking/next-button.module.css";
import styles from "../../styles/features/booking/step-nav.module.css";
import type { BookingController } from "./hooks/use-booking";

interface StepNavProps {
  booking: BookingController;
}

/** Desktop Back / Continue under each step (hidden under 960px, where the mobile bar takes over). */
export const StepNav = ({ booking }: StepNavProps) => {
  const { state, nextDisabled, actions } = booking;
  const { step } = state;

  return (
    <div className={joinClassNames(pageGlobal.navbtns, styles.row)}>
      {step > 1 && step < 6 && (
        <button
          onClick={actions.goBack}
          aria-label="Back"
          className={styles.back}
        >
          <ArrowLeft size={18} strokeWidth={2} />
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
