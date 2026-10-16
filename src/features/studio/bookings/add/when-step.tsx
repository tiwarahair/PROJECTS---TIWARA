import { Check } from "lucide-react";
import { joinClassNames } from "../../../../utils/class-names";
import {
  CalendarToggle,
  MonthCalendar,
  getMonthNav,
} from "../../shell/month-calendar";
import type { StudioController } from "../../core/use-studio";
import { CustomTime, DayStrip, TimeSlots } from "../steps";
import type { AddBookingView } from "./view";
import styles from "../../../../styles/features/studio/bookings/add/when-step.module.css";
import shared from "../../../../styles/features/studio/bookings/add/index.module.css";

interface WhenStepProps {
  studio: StudioController;
  view: AddBookingView;
}

/** Step 3: day, time and overlap check. */
export const WhenStep = ({ studio, view }: WhenStepProps) => {
  const monthNav = getMonthNav(studio, "calendarMonth", "calendarYear");

  return (
    <>
      <div className={styles.whenHead}>
        <div className={shared.label145}>When?</div>
        <CalendarToggle
          isOpen={view.isCalendarOpen}
          onClick={view.toggleCalendar}
        />
      </div>
      {!view.isCalendarOpen && <DayStrip days={view.days} />}
      {view.isCalendarOpen && (
        <MonthCalendar monthNav={monthNav} days={view.calendarDays} isLoose />
      )}
      <TimeSlots
        times={view.times}
        isEmpty={view.isNoSlots}
        emptyText={view.noSlotsText}
        isCustom={view.isCustom}
        toggleCustom={view.toggleCustom}
      />
      {view.isCustom && (
        <CustomTime
          hint={view.customHint}
          isWarn={view.isCustomWarn}
          value={view.customTime}
          onChange={view.onCustomTime}
          min={view.customMinutes}
          max={view.customMax}
        />
      )}
      {view.hasConflict && (
        <div className={styles.conflict}>
          <div className={styles.conflictTitle}>Overlaps another booking</div>
          <div className={styles.conflictBody}>{view.conflictBody}</div>
          <button className={styles.overlap} onClick={view.toggleOverlap}>
            <span
              className={joinClassNames(
                styles.checkbox,
                view.isOverlapAllowed && styles.checkboxOn,
              )}
            >
              <Check size={12} strokeWidth={3} color="var(--neutral-100)" />
            </span>
            <span className={styles.overlapLabel}>Book it anyway</span>
          </button>
        </div>
      )}
      <div className={shared.summary}>{view.summary}</div>
    </>
  );
};
