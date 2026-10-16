import { ChevronLeft, ChevronRight } from "lucide-react";
import { joinClassNames } from "../../utils/class-names";
import { MONDAY_FIRST_WEEKDAYS } from "../../utils/dates";
import {
  type CalendarDay,
  formatLongDate,
  formatMonthTitle,
  getCalendarDays,
} from "./logic/calendar";
import type { Slot } from "./logic/slots";
import styles from "../../styles/features/booking/slot-calendar.module.css";

const getDayClass = ({
  day,
  selected,
  off,
}: Pick<CalendarDay, "day" | "selected" | "off">) => {
  if (day == null) return styles.dayBlank;

  if (selected) return styles.daySelected;

  return off ? styles.dayOff : styles.dayOpen;
};

export interface SlotCalendarProps {
  year: number;
  month: number;
  slotsByDay: Map<number, Slot[]>;
  isLoading: boolean;
  date: number | null;
  time: string | null;
  onMonthChange: (delta: number) => void;
  onPickDay: (day: number) => void;
  onPickTime: (slot: Slot) => void;
}

export const SlotCalendar = ({
  year,
  month,
  slotsByDay,
  isLoading,
  date,
  time,
  onMonthChange,
  onPickDay,
  onPickTime,
}: SlotCalendarProps) => (
  <div className={styles.calendar}>
    <div className={styles.monthRow}>
      <button
        onClick={() => onMonthChange(-1)}
        aria-label="Previous month"
        className={styles.monthButton}
      >
        <ChevronLeft size={20} strokeWidth={2} />
      </button>
      <div className={styles.monthTitle}>{formatMonthTitle(year, month)}</div>
      <button
        onClick={() => onMonthChange(1)}
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
    <div className={styles.days} aria-busy={isLoading}>
      {getCalendarDays(year, month, new Set(slotsByDay.keys()), date).map(
        ({ key, label, day, off, selected }) => (
          <button
            key={key}
            onClick={() => {
              if (day) onPickDay(day);
            }}
            disabled={off}
            className={joinClassNames(
              styles.day,
              getDayClass({ day, selected, off }),
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
          {`Times on ${formatLongDate(year, month, date)}`}
        </div>
        <div className={styles.slots}>
          {(slotsByDay.get(date) ?? []).map((slot) => (
            <button
              key={slot.time}
              onClick={() => onPickTime(slot)}
              className={joinClassNames(
                styles.slot,
                time === slot.time ? styles.slotSelected : styles.slotOpen,
              )}
            >
              {slot.time}
            </button>
          ))}
        </div>
      </div>
    )}
  </div>
);
