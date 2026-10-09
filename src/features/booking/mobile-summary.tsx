import { joinClassNames } from "../../utils/class-names";
import helmet from "./booking-helmet.module.css";
import next from "./next-button.module.css";
import styles from "./mobile-summary.module.css";
import type { BookingController } from "./use-booking";

interface MobileSummaryProps {
  booking: BookingController;
}

/** Fixed bottom bar under 960px: total, service · duration, Back and Continue. */
export const MobileSummary = ({ booking }: MobileSummaryProps) => {
  const { state, service, money, nextDisabled, actions } = booking;
  const { step } = state;
  return (
    <div className={joinClassNames(helmet.mobsum, styles.bar)}>
      <div className={styles.text}>
        <div className={styles.total}>{service ? money.total : "—"}</div>
        <div className={styles.line}>
          {(service ? service.name : "—") + " · " + money.duration}
        </div>
      </div>
      <div className={styles.actions}>
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
        <button
          onClick={actions.goNext}
          disabled={nextDisabled}
          className={joinClassNames(
            next.mobile,
            nextDisabled ? next.disabled : next.enabled,
          )}
        >
          {step === 5 ? "Continue to payment" : "Continue"}{" "}
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14"></path>
            <path d="m13 6 6 6-6 6"></path>
          </svg>
        </button>
      </div>
    </div>
  );
};
