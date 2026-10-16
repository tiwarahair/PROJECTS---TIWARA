import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { joinClassNames } from "../../utils/class-names";
import {
  type CalendarDay,
  formatLongDate,
  formatMonthTitle,
  getCalendarDays,
} from "./logic/calendar";
import step from "../../styles/features/booking/step.module.css";
import styles from "../../styles/features/booking/step-time.module.css";
import type { BookingController } from "./hooks/use-booking";
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
  const { state, stylist, money, slotsByDay, isLoadingSlots, actions } =
    booking;

  const { setState } = actions;
  const { calendarYear, calendarMonth, date, time } = state;

  const changeMonth = (delta: number) =>
    setState(({ calendarMonth: month, calendarYear: year }) => {
      const next = new Date(year, month + delta, 1);

      return {
        calendarMonth: next.getMonth(),
        calendarYear: next.getFullYear(),
        date: null,
        time: null,
        holdError: null,
      };
    });

  return (
    <>
      <h1 className={step.title}>Pick a time</h1>
      <p className={step.lead}>
        {`${stylist.name}'s live availability for ${money.duration}`}.
        {booking.closedLine}
      </p>
      {state.repickNote && (
        <div role="status" className={styles.reNote}>
          <Clock size={15} strokeWidth={1.5} />
          Pick your time again
        </div>
      )}
      {state.holdError && (
        <div role="alert" className={styles.reNote}>
          <Clock size={15} strokeWidth={1.5} />
          {state.holdError === "taken"
            ? "Sorry, that time was just booked. Pick another."
            : "We couldn't hold that time. Try again."}
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
        <div className={styles.days} aria-busy={isLoadingSlots}>
          {getCalendarDays(
            calendarYear,
            calendarMonth,
            new Set(slotsByDay.keys()),
            date,
          ).map(({ key, label, day, off, selected }) => (
            <button
              key={key}
              onClick={() => {
                if (day) setState({ date: day, time: null, holdError: null });
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
              {(slotsByDay.get(date) ?? []).map(({ time: slot }) => (
                <button
                  key={slot}
                  onClick={() => setState({ time: slot, holdError: null })}
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
