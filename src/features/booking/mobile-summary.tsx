import { ArrowLeft, ArrowRight } from "lucide-react";
import { joinClassNames } from "../../utils/class-names";
import pageGlobal from "../../styles/features/booking/page-global.module.css";
import next from "../../styles/features/booking/next-button.module.css";
import styles from "../../styles/features/booking/mobile-summary.module.css";
import type { BookingController } from "./hooks/use-booking";

interface MobileSummaryProps {
  booking: BookingController;
}

/** Fixed bottom bar under 960px: total, service · duration, Back and Continue. */
export const MobileSummary = ({ booking }: MobileSummaryProps) => {
  const { state, service, money, nextDisabled, actions } = booking;
  const { step } = state;

  return (
    <div className={joinClassNames(pageGlobal.mobsum, styles.bar)}>
      <div className={styles.text}>
        <div className={styles.total}>{service ? money.total : "—"}</div>
        <div className={styles.line}>
          {`${service ? service.name : "—"} · ${money.duration}`}
        </div>
      </div>
      <div className={styles.actions}>
        {step > 1 && step < 6 && (
          <button
            onClick={actions.goBack}
            aria-label="Back"
            className={styles.back}
          >
            <ArrowLeft size={18} strokeWidth={2} />
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
          <ArrowRight size={17} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
};
