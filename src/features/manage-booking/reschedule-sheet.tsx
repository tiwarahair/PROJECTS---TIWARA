import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ManagedBooking } from "../../lib/manage-booking-api";
import {
  getErrorMessage,
  useGetRescheduleSlotsQuery,
  useRescheduleBookingMutation,
} from "../../stores/api-slice";
import { getMonthRange, groupSlotsByDay } from "../booking/logic/slots";
import type { Slot } from "../booking/logic/slots";
import { SlotCalendar } from "../booking/slot-calendar";
import { formatWhen } from "./manage-booking-logic";
import styles from "../../styles/features/manage-booking/reschedule-sheet.module.css";

const ERRORS: Record<string, string> = {
  slot_taken: "Sorry, that time was just booked. Pick another.",
  reschedule_not_allowed: "This booking can't be rescheduled any more.",
};

interface RescheduleSheetProps {
  booking: ManagedBooking;
  token: string;
  onDone: () => void;
  onClose: () => void;
}

export const RescheduleSheet = ({
  booking,
  token,
  onDone,
  onClose,
}: RescheduleSheetProps) => {
  const [month, setMonth] = useState(() => {
    const today = new Date();

    return { year: today.getFullYear(), month: today.getMonth() };
  });

  const [date, setDate] = useState<number | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [error, setError] = useState("");
  const [reschedule, { isLoading: isSaving }] = useRescheduleBookingMutation();

  const { currentData, isFetching } = useGetRescheduleSlotsQuery({
    token,
    ...getMonthRange(month.year, month.month),
  });

  const slotsByDay = useMemo(
    () => groupSlotsByDay(currentData ?? []),
    [currentData],
  );

  useEffect(() => {
    const onKey = ({ key }: KeyboardEvent) => {
      if (key === "Escape" && !isSaving) onClose();
    };

    document.addEventListener("keydown", onKey);

    return () => document.removeEventListener("keydown", onKey);
  }, [isSaving, onClose]);

  const changeMonth = (delta: number) => {
    const next = new Date(month.year, month.month + delta, 1);

    setMonth({ year: next.getFullYear(), month: next.getMonth() });
    setDate(null);
    setSlot(null);
  };

  const confirm = async () => {
    if (!slot) return;

    setError("");

    try {
      await reschedule({ token, startsAt: slot.startsAt }).unwrap();
      onDone();
    } catch (rescheduleError) {
      setSlot(null);

      setError(
        ERRORS[getErrorMessage(rescheduleError)] ??
          "We couldn't reschedule. Try again.",
      );
    }
  };

  return (
    // the scrim closes on click; the sheet stops the click
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events
    <div onClick={isSaving ? undefined : onClose} className={styles.scrim}>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mb-rs-t"
        onClick={(event) => event.stopPropagation()}
        className={styles.sheet}
      >
        <div className={styles.head}>
          <h2 id="mb-rs-t" className={styles.title}>
            Pick a new time
          </h2>
          <button onClick={onClose} aria-label="Close" className={styles.close}>
            <X size={20} strokeWidth={2} />
          </button>
        </div>
        <p className={styles.sub}>
          Same service and price.{" "}
          <strong>You can only change this once.</strong>
        </p>
        {!!error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        <SlotCalendar
          year={month.year}
          month={month.month}
          slotsByDay={slotsByDay}
          isLoading={isFetching}
          date={date}
          time={slot?.time ?? null}
          onMonthChange={changeMonth}
          onPickDay={(day) => {
            setDate(day);
            setSlot(null);
          }}
          onPickTime={setSlot}
        />
        <div className={styles.confirmBar}>
          {slot && (
            <p className={styles.change}>
              {`${formatWhen(slot.startsAt)} instead of ${formatWhen(booking.starts_at)}`}
            </p>
          )}
          <div className={styles.buttons}>
            <button onClick={onClose} className={styles.keep}>
              Keep current time
            </button>
            <button
              onClick={() => void confirm()}
              disabled={!slot || isSaving}
              className={styles.confirm}
            >
              {isSaving ? "Rescheduling…" : "Confirm new time"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
