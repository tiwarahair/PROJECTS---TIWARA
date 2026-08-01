import { cx } from "../../utils/class-names";
import {
  CALENDAR_DAY_NAMES,
  CALENDAR_DAYS,
  CALENDAR_MONTH_LABEL,
  TIME_SLOTS,
} from "../../data/booking-calendar";
import { BookingNav } from "./booking-nav";

export interface StepScheduleProps {
  dayNumber: number | null;
  timeSlotId: string | null;
  onSelectDay: (day: number) => void;
  onSelectTime: (slotId: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function StepSchedule({
  dayNumber,
  timeSlotId,
  onSelectDay,
  onSelectTime,
  onBack,
  onNext,
}: StepScheduleProps) {
  return (
    <>
      <div className="bp-step-title">Choose a date &amp; time</div>
      <div className="bp-step-sub">Pick a slot that suits you</div>

      <div className="bp-cal">
        <div className="bp-cal-header">
          {/* Month arrows have never done anything — the calendar is a fixed
              July 2026. Preserved as inert. */}
          <button className="bp-cal-nav">‹</button>
          <span className="bp-cal-month">{CALENDAR_MONTH_LABEL}</span>
          <button className="bp-cal-nav">›</button>
        </div>
        <div className="bp-cal-grid">
          {CALENDAR_DAY_NAMES.map((name) => (
            <div key={name} className="bp-cal-dn">
              {name}
            </div>
          ))}
          {CALENDAR_DAYS.map(({ day, available, isToday }) => (
            <div
              key={day}
              className={cx(
                "bp-cal-d",
                available ? "avail" : "unavail",
                isToday && "today",
                available && day === dayNumber && "sel-day",
              )}
              onClick={available ? () => onSelectDay(day) : undefined}
            >
              {day}
            </div>
          ))}
        </div>
      </div>

      <div className="bp-times-label">Available times</div>
      <div className="bp-times">
        {TIME_SLOTS.map(({ id, label, taken }) => (
          <div
            key={id}
            className={cx(
              "bp-time",
              taken && "taken",
              !taken && id === timeSlotId && "sel-t",
            )}
            onClick={taken ? undefined : () => onSelectTime(id)}
          >
            {label}
          </div>
        ))}
      </div>

      <BookingNav onBack={onBack} onNext={onNext} nextLabel="Continue →" />
    </>
  );
}
