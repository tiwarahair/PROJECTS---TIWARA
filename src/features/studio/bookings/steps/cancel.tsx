import { Check } from "lucide-react";
import { joinClassNames } from "../../../../utils/class-names";
import type { StudioController } from "../../core/use-studio";
import type { BookingSheetView } from "../sheet/view";
import { BookingSummary } from "./booking-summary";
import styles from "../../../../styles/features/studio/bookings/steps/cancel.module.css";
import shared from "../../../../styles/features/studio/bookings/steps/index.module.css";

interface CancelStepProps {
  studio: StudioController;
  view: BookingSheetView;
}

export const CancelStep = ({ studio, view }: CancelStepProps) => {
  const { state, setState } = studio;

  return (
    <>
      <BookingSummary view={view} />
      <div className={shared.stepBody}>
        <div className={styles.whoLabel}>Who is cancelling?</div>
        <div className={styles.who}>
          {view.cancelWhoOptions.map(({ id, label }) => (
            <button
              key={id}
              className={joinClassNames(
                styles.whoOption,
                state.cancelWho === id && styles.whoOptionOn,
              )}
              onClick={() => setState({ cancelWho: id })}
            >
              {label}
            </button>
          ))}
        </div>
        <div className={styles.cancelBody}>{view.cancelBody}</div>
        {view.isFeeShown && (
          <button
            className={styles.feeToggle}
            onClick={() => setState({ cancelFee: !state.cancelFee })}
          >
            <span
              className={joinClassNames(
                styles.checkbox,
                state.cancelFee && styles.checkboxOn,
              )}
            >
              <Check size={12} strokeWidth={3} color="var(--neutral-100)" />
            </span>
            <span className={styles.feeLabel}>{view.feeLabel}</span>
          </button>
        )}
        <input
          className={styles.reason}
          value={state.cancelReason}
          onChange={(event) => setState({ cancelReason: event.target.value })}
          placeholder="Reason (optional)"
        />
      </div>
    </>
  );
};
