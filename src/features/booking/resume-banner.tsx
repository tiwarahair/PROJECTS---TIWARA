import { X } from "lucide-react";
import { findService } from "../../utils/services";
import { formatShortDate } from "./logic/calendar";
import styles from "../../styles/features/booking/resume-banner.module.css";
import type { BookingController } from "./hooks/use-booking";

interface ResumeBannerProps {
  booking: BookingController;
}

/** "Pick up where you left off?" for a saved draft: Start over / Continue / dismiss. */
export const ResumeBanner = ({ booking }: ResumeBannerProps) => {
  const { state, stylist, actions } = booking;
  const draft = state.resumeDraft;

  if (!draft) return null;

  const draftService = findService(stylist, draft.serviceId);

  const when = draft.date
    ? formatShortDate(draft.calendarYear, draft.calendarMonth, draft.date) +
      (draft.time ? `, ${draft.time}` : "")
    : "";

  return (
    <div
      data-screen-label="Resume banner"
      role="region"
      aria-label="Unfinished booking"
      className={styles.banner}
    >
      <div className={styles.text}>
        <div className={styles.title}>Pick up where you left off?</div>
        <div className={styles.line}>
          {(draftService ? draftService.name : "Your booking") +
            (when ? ` · ${when}` : "")}
        </div>
      </div>
      <div className={styles.actions}>
        <button onClick={actions.resumeStartOver} className={styles.startOver}>
          Start over
        </button>
        <button onClick={actions.resumeContinue} className={styles.continue}>
          Continue
        </button>
        <button
          onClick={() => actions.setState({ resumeDraft: null })}
          aria-label="Dismiss"
          className={styles.dismiss}
        >
          <X size={18} strokeWidth={1.7} />
        </button>
      </div>
    </div>
  );
};
