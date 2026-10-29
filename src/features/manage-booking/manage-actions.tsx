import type { ManagedBooking } from "../../lib/manage-booking-api";
import { getRescheduleNote, getTermsLine } from "./logic";
import styles from "../../styles/features/manage-booking/manage-actions.module.css";

interface ManageActionsProps {
  booking: ManagedBooking;
  onReschedule: () => void;
  onCancel: () => void;
}

export const ManageActions = ({
  booking,
  onReschedule,
  onCancel,
}: ManageActionsProps) => {
  if (!booking.can_cancel)
    return <p className={styles.note}>This appointment has passed.</p>;

  return (
    <div className={styles.actions}>
      <p className={styles.terms}>{getTermsLine(booking)}</p>
      {!booking.can_reschedule && !!getRescheduleNote(booking) && (
        <p className={styles.note}>{getRescheduleNote(booking)}</p>
      )}
      <div className={styles.buttons}>
        {booking.can_reschedule && (
          <button onClick={onReschedule} className={styles.change}>
            Reschedule
          </button>
        )}
        <button onClick={onCancel} className={styles.cancel}>
          Cancel booking
        </button>
      </div>
    </div>
  );
};
