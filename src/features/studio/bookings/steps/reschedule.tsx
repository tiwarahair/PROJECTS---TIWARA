import {
  CalendarToggle,
  MonthCalendar,
  getMonthNav,
} from "../../shell/month-calendar";
import { getMiniCalendarDays } from "../../core/format";
import type { StudioController } from "../../core/use-studio";
import type { BookingSheetView } from "../sheet/view";
import { BookingSummary } from "./booking-summary";
import { CustomTime } from "./custom-time";
import { DayStrip } from "./day-strip";
import { TimeSlots } from "./time-slots";
import styles from "../../../../styles/features/studio/bookings/steps/reschedule.module.css";
import shared from "../../../../styles/features/studio/bookings/steps/index.module.css";

interface RescheduleStepProps {
  studio: StudioController;
  view: BookingSheetView;
}

export const RescheduleStep = ({ studio, view }: RescheduleStepProps) => {
  const { state, setState } = studio;

  const monthNav = getMonthNav(
    studio,
    "rescheduleCalendarMonth",
    "rescheduleCalendarYear",
  );

  const toggleCalendar = () => {
    const today = new Date();

    setState({
      rescheduleCalendarOpen: !state.rescheduleCalendarOpen,
      rescheduleCalendarMonth:
        state.rescheduleCalendarMonth == null
          ? today.getMonth()
          : state.rescheduleCalendarMonth,
      rescheduleCalendarYear:
        state.rescheduleCalendarYear == null
          ? today.getFullYear()
          : state.rescheduleCalendarYear,
    });
  };

  return (
    <>
      <BookingSummary view={view} />
      <div className={shared.stepBody}>
        <div className={styles.pickHead}>
          <div className={shared.label145}>Pick a new time</div>
          <CalendarToggle
            isOpen={state.rescheduleCalendarOpen}
            onClick={toggleCalendar}
          />
        </div>
        {!state.rescheduleCalendarOpen && (
          <DayStrip days={view.rescheduleDays} />
        )}
        {state.rescheduleCalendarOpen && (
          <MonthCalendar
            monthNav={monthNav}
            days={getMiniCalendarDays(
              monthNav.month,
              monthNav.year,
              state.rescheduleDay,
              (offset) => setState({ rescheduleDay: offset }),
              0,
            )}
          />
        )}
        <TimeSlots
          times={view.rescheduleTimes}
          isEmpty={view.hasNoSlots}
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
          />
        )}
        {!!view.rescheduleWarning && (
          <div className={styles.warning}>{view.rescheduleWarning}</div>
        )}
        <div className={styles.told}>
          {`${view.booking.firstName} is told about the new time straight away. No deposit is lost.`}
        </div>
      </div>
    </>
  );
};
