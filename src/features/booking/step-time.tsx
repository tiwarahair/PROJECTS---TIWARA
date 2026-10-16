import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { joinClassNames } from "../../utils/class-names";
import {
  type CalendarDay,
  formatLongDate,
  formatMonthTitle,
  getCalendarDays,
  getClosedLine,
  getSlots,
} from "./booking-calendar";
import { getHoldKey } from "./booking-state";
import step from "../../styles/features/booking/booking-step.module.css";
import styles from "../../styles/features/booking/step-time.module.css";
import type { BookingController } from "./use-booking";
import { MONDAY_FIRST_WEEKDAYS } from "../../utils/dates";

const getDayClass = ({
  day,
  selected,
  off,
}: Pick<CalendarDay, "day" | "selected" | "off">) => {
  if (day == null) return styles.dayBlank;

  if (selected) return styles.daySelected;

  return off ? styles.dayOff : styles.dayOpen;
};

interface StepTimeProps {
  booking: BookingController;
}

/** Step 3 (Pick a time): month calendar of days with slots, then that day's start times. */
export const StepTime = ({ booking }: StepTimeProps) => {
  const { state, stylist, money, actions } = booking;
  const { setState } = actions;
  const { calendarYear, calendarMonth, date, time } = state;

  const changeMonth = (delta: number) =>
    setState(({ calendarMonth: month, calendarYear: year }) => {
      const next = month + delta;

      if (next < 0)
        return {
          calendarMonth: 11,
          calendarYear: year - 1,
          date: null,
          time: null,
        };

      if (next > 11)
        return {
          calendarMonth: 0,
          calendarYear: year + 1,
          date: null,
          time: null,
        };

      return { calendarMonth: next, date: null, time: null };
    });

  return (
    <>
      <h1 className={step.title}>Pick a time</h1>
      <p className={step.lead}>
        {`${stylist.name}'s live availability for ${money.duration}`}.
        {getClosedLine(stylist)}
      </p>
      {state.repickNote && (
        <div role="status" className={styles.reNote}>
          <Clock size={15} strokeWidth={1.5} />
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
            <ChevronLeft size={20} strokeWidth={2} />
          </button>
          <div className={styles.monthTitle}>
            {formatMonthTitle(calendarYear, calendarMonth)}
          </div>
          <button
            onClick={() => changeMonth(1)}
            aria-label="Next month"
            className={styles.monthButton}
          >
            <ChevronRight size={20} strokeWidth={2} />
          </button>
        </div>
        <div className={styles.weekdays}>
          {MONDAY_FIRST_WEEKDAYS.map((label) => (
            <div key={label} className={styles.weekday}>
              {label}
            </div>
          ))}
        </div>
        <div className={styles.days}>
          {getCalendarDays(
            stylist,
            calendarYear,
            calendarMonth,
            money.minutes,
            date,
          ).map(({ key, label, day, off, selected }) => (
            <button
              key={key}
              onClick={() => {
                if (day) setState({ date: day, time: null, hold: null });
              }}
              disabled={off}
              className={joinClassNames(
                styles.day,
                getDayClass({ day, selected, off }),
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {!!date && (
          <div className={styles.times}>
            <div className={styles.timesTitle}>
              {`Times on ${formatLongDate(calendarYear, calendarMonth, date)}`}
            </div>
            <div className={styles.slots}>
              {getSlots(
                stylist,
                calendarYear,
                calendarMonth,
                date,
                money.minutes,
              ).map((slot) => (
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
                            current.calendarYear,
                            current.calendarMonth,
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
