import type { CSSProperties } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { joinClassNames } from "../../../utils/class-names";
import type { MiniCalendarDay } from "../core/format";
import type { StudioState } from "../core/types";
import type { StudioController } from "../core/use-studio";
import styles from "../../../styles/features/studio/shell/month-calendar.module.css";
import { MONDAY_FIRST_WEEKDAYS, LONG_MONTHS } from "../../../utils/dates";

type MonthKey =
  | "blockCalendarMonth"
  | "calendarMonth"
  | "rescheduleCalendarMonth"
  | "endCalendarMonth";
type YearKey =
  | "blockCalendarYear"
  | "calendarYear"
  | "rescheduleCalendarYear"
  | "endCalendarYear";

/** Month navigation for one of the sheets' calendars; it never goes before this month. */
export const getMonthNav = (
  studio: StudioController,
  monthKey: MonthKey,
  yearKey: YearKey,
) => {
  const { state, setState } = studio;
  const now = new Date();

  const month =
    state[monthKey] == null ? now.getMonth() : (state[monthKey] as number);

  const year =
    state[yearKey] == null ? now.getFullYear() : (state[yearKey] as number);

  const rawMonth = state[monthKey] as number | null;
  const rawYear = state[yearKey] as number | null;

  const isPrevOff =
    rawYear == null ||
    rawYear < now.getFullYear() ||
    (rawYear === now.getFullYear() && (rawMonth ?? 0) <= now.getMonth());

  return {
    month,
    year,
    title: `${LONG_MONTHS[month]} ${year}`,
    isPrevOff,
    prev: () => {
      if (isPrevOff) return;

      setState(
        (rawMonth === 0
          ? { [monthKey]: 11, [yearKey]: (rawYear ?? 0) - 1 }
          : {
              [monthKey]: (rawMonth ?? 0) - 1,
              [yearKey]: rawYear,
            }) as Partial<StudioState>,
      );
    },
    next: () =>
      setState(
        (rawMonth === 11
          ? { [monthKey]: 0, [yearKey]: (rawYear ?? 0) + 1 }
          : {
              [monthKey]: (rawMonth ?? 0) + 1,
              [yearKey]: rawYear,
            }) as Partial<StudioState>,
      ),
  };
};

/** A month grid inside a sheet (block time, new booking, reschedule, repeat-until). */
export const MonthCalendar = ({
  monthNav,
  days,
  className,
  isLoose = false,
}: {
  monthNav: ReturnType<typeof getMonthNav>;
  days: MiniCalendarDay[];
  className?: string;
  /** New booking's weekday row is spaced 4px instead of 2px. */
  isLoose?: boolean;
}) => (
  <div className={joinClassNames(styles.month, className)}>
    <div className={styles.monthHead}>
      <button
        className={joinClassNames(
          styles.monthArrow,
          monthNav.isPrevOff && styles.monthArrowOff,
        )}
        onClick={monthNav.prev}
        disabled={monthNav.isPrevOff}
        aria-label="Previous month"
      >
        <ChevronLeft size={15} strokeWidth={2} />
      </button>
      <div className={styles.h3}>{monthNav.title}</div>
      <button
        className={styles.monthArrow}
        onClick={monthNav.next}
        aria-label="Next month"
      >
        <ChevronRight size={15} strokeWidth={2} />
      </button>
    </div>
    <div className={joinClassNames(styles.dows, isLoose && styles.dowsLoose)}>
      {MONDAY_FIRST_WEEKDAYS.map((weekday) => (
        <div key={weekday} className={styles.dow}>
          {weekday}
        </div>
      ))}
    </div>
    <div className={styles.days}>
      {days.map(
        ({ key, dayNumber, disabled, background, color, weight, pick }) => (
          <button
            key={key}
            className={styles.day}
            // runtime: the day's selected / past state
            style={
              {
                "--day-bg": background,
                "--day-color": color,
                "--day-weight": weight,
              } as CSSProperties
            }
            onClick={pick}
            disabled={disabled}
          >
            {dayNumber}
          </button>
        ),
      )}
    </div>
  </div>
);

export const CalendarToggle = ({
  isOpen,
  onClick,
}: {
  isOpen: boolean;
  onClick: () => void;
}) => (
  <button
    className={joinClassNames(styles.calToggle, isOpen && styles.calToggleOn)}
    onClick={onClick}
    aria-label="Open calendar"
  >
    <Calendar size={16} strokeWidth={1.7} />
  </button>
);
