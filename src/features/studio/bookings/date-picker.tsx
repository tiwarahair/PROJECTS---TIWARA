import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { joinClassNames } from "../../../utils/class-names";
import { asStyle } from "../../../utils/as-style";
import { MONDAY_FIRST_WEEKDAYS } from "../../../utils/dates";
import { dateAt } from "../core/format";
import type { StudioController } from "../core/use-studio";
import type { BookingsView } from "./view";
import styles from "../../../styles/features/studio/bookings/date-picker.module.css";
import shared from "../../../styles/features/studio/bookings/index.module.css";

interface DatePickerProps {
  studio: StudioController;
  view: BookingsView;
}

export const DatePicker = ({ studio, view }: DatePickerProps) => {
  const { state, setState } = studio;

  const toggle = () => {
    const date = dateAt(state.dayIndex);

    setState({
      datePickerOpen: !state.datePickerOpen,
      bookingCalendarMonth: state.datePickerOpen
        ? state.bookingCalendarMonth
        : date.getMonth(),
      bookingCalendarYear: state.datePickerOpen
        ? state.bookingCalendarYear
        : date.getFullYear(),
    });
  };

  const now = new Date();

  const goPrev = () => {
    const month = state.bookingCalendarMonth ?? 0;
    const year = state.bookingCalendarYear ?? 0;

    if (
      year < now.getFullYear() ||
      (year === now.getFullYear() && month <= now.getMonth())
    )
      return;

    setState(
      month === 0
        ? { bookingCalendarMonth: 11, bookingCalendarYear: year - 1 }
        : { bookingCalendarMonth: month - 1, bookingCalendarYear: year },
    );
  };

  const goNext = () => {
    const month = state.bookingCalendarMonth ?? 0;
    const year = state.bookingCalendarYear ?? 0;

    setState(
      month === 11
        ? { bookingCalendarMonth: 0, bookingCalendarYear: year + 1 }
        : { bookingCalendarMonth: month + 1, bookingCalendarYear: year },
    );
  };

  return (
    <div className={shared.dateNav}>
      <button
        className={styles.weekArrow}
        onClick={() => studio.actions.setDay({ dayIndex: state.dayIndex - 7 })}
        disabled={false}
        aria-label="Previous week"
      >
        <ChevronLeft size={15} strokeWidth={2} />
      </button>
      <button className={styles.dateButton} onClick={toggle}>
        <span className={styles.dateLabel}>{view.calendarDateLabel}</span>
        <ChevronDown
          className={joinClassNames(
            styles.chevron,
            state.datePickerOpen && styles.chevronOpen,
          )}
          size={13}
          strokeWidth={2.2}
        />
      </button>
      <button
        className={joinClassNames(styles.weekArrow, styles.weekArrowNext)}
        onClick={() => studio.actions.setDay({ dayIndex: state.dayIndex + 7 })}
        aria-label="Next week"
      >
        <ChevronRight size={15} strokeWidth={2} />
      </button>
      {state.datePickerOpen && (
        <>
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
          <div className={styles.pickerScrim} onClick={toggle}></div>
          <div className={shared.picker}>
            <div className={styles.pickerHead}>
              <button
                className={joinClassNames(
                  styles.monthArrow,
                  view.isPrevOff && styles.monthArrowOff,
                )}
                onClick={goPrev}
                disabled={view.isPrevOff}
                aria-label="Previous month"
              >
                <ChevronLeft size={15} strokeWidth={2} />
              </button>
              <div className={styles.h3}>{view.pickerTitle}</div>
              <button
                className={styles.monthArrow}
                onClick={goNext}
                aria-label="Next month"
              >
                <ChevronRight size={15} strokeWidth={2} />
              </button>
            </div>
            <div className={styles.dows}>
              {MONDAY_FIRST_WEEKDAYS.map((weekday) => (
                <div key={weekday} className={styles.dow}>
                  {weekday}
                </div>
              ))}
            </div>
            <div className={styles.days}>
              {view.pickerDays.map(
                ({
                  key,
                  dayNumber,
                  disabled,
                  background,
                  color,
                  weight,
                  dot,
                  pick,
                }) => (
                  <button
                    key={key}
                    className={styles.calDay}
                    // runtime: the day's selected / past state and booking dot
                    style={asStyle({
                      "--day-bg": background,
                      "--day-color": color,
                      "--day-weight": weight,
                    })}
                    onClick={pick}
                    disabled={disabled}
                  >
                    {dayNumber}
                    <span
                      className={shared.dot}
                      style={asStyle({ "--dot": dot })}
                    ></span>
                  </button>
                ),
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
