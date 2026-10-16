import { Clock } from "lucide-react";
import step from "../../styles/features/booking/step.module.css";
import styles from "../../styles/features/booking/step-time.module.css";
import type { BookingController } from "./hooks/use-booking";
import { SlotCalendar } from "./slot-calendar";

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
      <SlotCalendar
        year={calendarYear}
        month={calendarMonth}
        slotsByDay={slotsByDay}
        isLoading={isLoadingSlots}
        date={date}
        time={time}
        onMonthChange={changeMonth}
        onPickDay={(day) =>
          setState({ date: day, time: null, holdError: null })
        }
        onPickTime={({ time: slot }) =>
          setState({ time: slot, holdError: null })
        }
      />
    </>
  );
};
