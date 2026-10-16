import { Calendar, X } from "lucide-react";
import { GATE_REASON } from "../core/constants";
import { copyText } from "../core/format";
import { getBookingLink } from "../core/model";
import type { StudioController } from "../core/use-studio";
import { isGated } from "../shell";
import styles from "../../../styles/features/studio/bookings/empty-card.module.css";
import shared from "../../../styles/features/studio/bookings/index.module.css";

interface EmptyCardProps {
  studio: StudioController;
}

export const EmptyCard = ({ studio }: EmptyCardProps) => {
  const { state, setState, actions } = studio;

  const copyLink = () => {
    if (isGated(studio)) {
      actions.showToast(GATE_REASON);

      return;
    }

    copyText(getBookingLink(state));
    actions.showToast("Booking link copied");
  };

  return (
    <div className={styles.emptyHolder}>
      <div className={shared.emptyLayer}>
        <div className={styles.emptyCard} data-screen-label="Calendar empty">
          <button
            className={styles.emptyClose}
            onClick={() => setState({ calendarEmptyHidden: true })}
            aria-label="Close"
          >
            <X size={16} strokeWidth={2} />
          </button>
          <span className={styles.emptyIcon}>
            <Calendar size={20} strokeWidth={2} />
          </span>
          <div className={styles.emptyTitle}>No appointments yet</div>
          <div className={styles.emptyBody}>
            Share your booking link to get your first one.
          </div>
          <div className={styles.emptyActions}>
            <button className={styles.primary} onClick={copyLink}>
              Copy booking link
            </button>
            <button
              className={styles.secondary}
              onClick={() => actions.openSheet("add")}
            >
              Add a booking yourself
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
