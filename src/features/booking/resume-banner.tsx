import { findService } from "../../utils/services";
import { formatShortDate } from "./booking-calendar";
import styles from "./resume-banner.module.css";
import type { BookingController } from "./use-booking";

interface ResumeBannerProps {
  booking: BookingController;
}

/** "Pick up where you left off?" for a saved draft: Start over / Continue / dismiss. */
export const ResumeBanner = ({ booking }: ResumeBannerProps) => {
  const { state, stylist, actions } = booking;
  const draft = state.resumeDraft;
  if (!draft) return null;
  const draftService = findService(stylist, draft.svc);
  const when = draft.date
    ? formatShortDate(draft.calY, draft.calM, draft.date) +
      (draft.time ? ", " + draft.time : "")
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
            (when ? " · " + when : "")}
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
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M18 6 6 18M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    </div>
  );
};
