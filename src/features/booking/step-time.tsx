import { joinClassNames } from "../../utils/class-names";
import {
  DOW_LABELS,
  formatLongDate,
  formatMonthTitle,
  getCalendarDays,
  getClosedLine,
  getSlots,
} from "./booking-calendar";
import { getHoldKey } from "./booking-state";
import step from "./booking-step.module.css";
import styles from "./step-time.module.css";
import type { BookingController } from "./use-booking";

interface StepTimeProps {
  booking: BookingController;
}

/** Step 3 (Pick a time): month calendar of days with slots, then that day's start times. */
export const StepTime = ({ booking }: StepTimeProps) => {
  const { state, stylist, money, actions } = booking;
  const { setState } = actions;
  const { calY, calM, date, time } = state;
  const changeMonth = (delta: number) =>
    setState(({ calM: month, calY: year }) => {
      const next = month + delta;
      if (next < 0) return { calM: 11, calY: year - 1, date: null, time: null };
      if (next > 11) return { calM: 0, calY: year + 1, date: null, time: null };
      return { calM: next, date: null, time: null };
    });

  return (
    <>
      <h1 className={step.title}>Pick a time</h1>
      <p className={step.lead}>
        {stylist.name + "'s live availability for " + money.duration}.
        {getClosedLine(stylist)}
      </p>
      {state.reNote && (
        <div role="status" className={styles.reNote}>
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <circle cx="12" cy="12" r="9"></circle>
            <path d="M12 7v5l3 2"></path>
          </svg>
          Pick your time again
        </div>
      )}
      <div className={styles.calendar}>
        <div className={styles.monthRow}>
          <button
            onClick={() => changeMonth(-1)}
            aria-label="Previous month"
            className={styles.monthButton}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="m15 18-6-6 6-6"></path>
            </svg>
          </button>
          <div className={styles.monthTitle}>
            {formatMonthTitle(calY, calM)}
          </div>
          <button
            onClick={() => changeMonth(1)}
            aria-label="Next month"
            className={styles.monthButton}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="m9 18 6-6-6-6"></path>
            </svg>
          </button>
        </div>
        <div className={styles.weekdays}>
          {DOW_LABELS.map((label) => (
            <div key={label} className={styles.weekday}>
              {label}
            </div>
          ))}
        </div>
        <div className={styles.days}>
          {getCalendarDays(stylist, calY, calM, money.mins, date).map(
            ({ key, label, day, off, selected }) => (
              <button
                key={key}
                onClick={() => {
                  if (day) setState({ date: day, time: null, hold: null });
                }}
                disabled={off}
                className={joinClassNames(
                  styles.day,
                  day == null
                    ? styles.dayBlank
                    : selected
                      ? styles.daySelected
                      : off
                        ? styles.dayOff
                        : styles.dayOpen,
                )}
              >
                {label}
              </button>
            ),
          )}
        </div>
        {!!date && (
          <div className={styles.times}>
            <div className={styles.timesTitle}>
              {"Times on " + formatLongDate(calY, calM, date)}
            </div>
            <div className={styles.slots}>
              {getSlots(stylist, calY, calM, date, money.mins).map((slot) => (
                <button
                  key={slot}
                  onClick={() =>
                    setState((current) => ({
                      time: slot,
                      // keep the hold when coming back to the same held slot
                      hold:
                        current.hold &&
                        current.hold.key ===
                          getHoldKey(
                            current.calY,
                            current.calM,
                            current.date,
                            slot,
                          )
                          ? current.hold
                          : null,
                    }))
                  }
                  disabled={false}
                  className={joinClassNames(
                    styles.slot,
                    time === slot ? styles.slotSelected : styles.slotOpen,
                  )}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};
