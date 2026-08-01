import type { ReviewSnapshot } from "../../types/booking";

/** Static in the original, like the review step's date row. */
const FIXED_DATE_LABEL = "Fri 11 July, 1:30 pm";

export interface StepConfirmProps {
  review: ReviewSnapshot;
  stylistName: string;
  onDone: () => void;
}

export function StepConfirm({
  review: { service, size, length, colour },
  stylistName,
  onDone,
}: StepConfirmProps) {
  return (
    <div className="bp-confirm-inner">
      <div className="bp-confirm-check">✓</div>
      <div className="bp-confirm-title">You&apos;re booked!</div>
      <p className="bp-confirm-sub">
        A confirmation has been sent to your inbox with all details, the
        address, and a reschedule link.
      </p>
      <div className="bp-confirm-summary">
        <strong>
          {service} — {colour}, {size}, {length}
        </strong>
        <span>
          {FIXED_DATE_LABEL} ·{" "}
          <span className="sum-stylist-name">{stylistName}</span>
        </span>
      </div>
      <div className="bp-cal-btns">
        <a href="#" className="bp-cal-btn">
          + Google Calendar
        </a>
        <a href="#" className="bp-cal-btn">
          + Apple Calendar
        </a>
      </div>
      <div className="bp-confirm-done-wrap">
        <button className="bp-btn-back bp-btn-full" onClick={onDone}>
          Done
        </button>
      </div>
    </div>
  );
}
