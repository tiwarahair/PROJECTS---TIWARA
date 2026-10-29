import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import type { ManagedBooking as Booking } from "../../lib/manage-booking-api";
import {
  getErrorMessage,
  useCancelBookingMutation,
} from "../../stores/api-slice";
import { BookingCard } from "./booking-card";
import { BookingNotes } from "./booking-notes";
import { CodeDialog } from "./code-dialog";
import { ConfirmDialog } from "./confirm-dialog";
import { ManageActions } from "./manage-actions";
import { getCancelLines, getRefundTiming, isCancelledStatus } from "./logic";
import { RescheduleSheet } from "./reschedule-sheet";
import styles from "../../styles/features/manage-booking/index.module.css";
import toastStyles from "../../styles/features/manage-booking/manage-toast.module.css";
import { formatPence } from "../../utils/money";

const TOAST_MS = 2600;

const getTitle = (isCancelled: boolean, isPast: boolean, stylist: string) => {
  if (isCancelled) return "Your booking is cancelled";

  return isPast
    ? `Your appointment with ${stylist}`
    : `You’re booked with ${stylist}`;
};

type Action = "reschedule" | "cancel";

interface ManagedBookingProps {
  booking: Booking;
  token: string;
  onRefresh: () => void;
}

export const ManagedBooking = ({
  booking,
  token,
  onRefresh,
}: ManagedBookingProps) => {
  const [isCancelOpen, setCancelOpen] = useState(false);
  const [isRescheduling, setRescheduling] = useState(false);
  const [confirming, setConfirming] = useState<Action | null>(null);

  const [cancelError, setCancelError] = useState("");
  const [toast, setToast] = useState("");
  const toastTimer = useRef(0);

  const [cancelBooking, { isLoading: isCancelling }] =
    useCancelBookingMutation();

  const stylist = booking.stylist_name;
  const isCancelled = isCancelledStatus(booking.status);
  const isPast = !isCancelled && !booking.can_cancel;

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const showToast = (text: string) => {
    window.clearTimeout(toastTimer.current);
    setToast(text);
    toastTimer.current = window.setTimeout(() => setToast(""), TOAST_MS);
  };

  const runAction = (action: Action) => {
    if (action === "reschedule") return setRescheduling(true);

    setCancelError("");
    setCancelOpen(true);
    onRefresh();
  };

  const startAction = (action: Action) =>
    booking.is_verified ? runAction(action) : setConfirming(action);

  const askForCode = (action: Action) => {
    setRescheduling(false);
    setCancelOpen(false);
    setConfirming(action);
  };

  const cancel = async () => {
    setCancelError("");

    try {
      await cancelBooking(token).unwrap();
      setCancelOpen(false);
      showToast("Booking cancelled");
    } catch (error) {
      if (getErrorMessage(error) === "confirm_needed")
        return askForCode("cancel");

      setCancelError("We couldn't cancel your booking. Try again.");
    }
  };

  const {
    fee_pence: fee,
    refund_pence: refunded,
    charge_pence: charge,
  } = booking.cancellation;

  return (
    <>
      <div className={styles.eyebrow}>Your booking</div>
      <h1 className={styles.title}>{getTitle(isCancelled, isPast, stylist)}</h1>
      <BookingCard booking={booking} />
      {isCancelled && (
        <div className={styles.cancelledNote}>
          {!!refunded && (
            <p>
              {fee
                ? `${formatPence(refunded)} ${getRefundTiming(fee)}`
                : `${formatPence(refunded)} is refunded to your card. It can take 5 to 10 working days.`}
            </p>
          )}
          {!!charge && (
            <p>{`A ${formatPence(charge)} late cancellation fee is due under ${stylist}'s policy.`}</p>
          )}
          <Link to={`/${booking.stylist_slug}`} className={styles.bookAgain}>
            {`Book again with ${stylist}`}
          </Link>
        </div>
      )}
      {!isCancelled && (
        <ManageActions
          booking={booking}
          onReschedule={() => startAction("reschedule")}
          onCancel={() => startAction("cancel")}
        />
      )}
      {!isCancelled && isRescheduling && (
        <RescheduleSheet
          booking={booking}
          token={token}
          onClose={() => setRescheduling(false)}
          onConfirmNeeded={() => askForCode("reschedule")}
          onDone={() => {
            setRescheduling(false);
            showToast("Booking rescheduled");
          }}
        />
      )}
      {!isCancelled && !!confirming && (
        <CodeDialog
          token={token}
          action={confirming}
          onClose={() => setConfirming(null)}
          onVerified={() => {
            setConfirming(null);
            runAction(confirming);
          }}
        />
      )}
      {!isCancelled && <BookingNotes booking={booking} />}
      {isCancelOpen && (
        <ConfirmDialog
          title="Cancel this booking?"
          lines={getCancelLines(booking, booking.cancellation)}
          cancelLabel="Keep booking"
          confirmLabel={isCancelling ? "Cancelling…" : "Cancel booking"}
          isBusy={isCancelling}
          error={cancelError}
          onCancel={() => setCancelOpen(false)}
          onConfirm={() => void cancel()}
        />
      )}
      {!!toast && (
        <div role="status" data-mb-anim="1" className={toastStyles.toast}>
          <Check size={18} strokeWidth={2.2} color="var(--brand-yellow)" />
          {toast}
        </div>
      )}
    </>
  );
};
