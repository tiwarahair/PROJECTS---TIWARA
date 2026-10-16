import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import type { ManagedBooking as Booking } from "../../lib/manage-booking-api";
import {
  getErrorMessage,
  useCancelBookingMutation,
  useUpdateBookingAllergiesMutation,
} from "../../stores/api-slice";
import { BookingCard } from "./booking-card";
import { CodeDialog } from "./code-dialog";
import { ConfirmDialog } from "./confirm-dialog";
import { ManageActions } from "./manage-actions";
import { getCancelLines, toPounds } from "./logic";
import { RescheduleSheet } from "./reschedule-sheet";
import { SharedDetails } from "./shared-details";
import styles from "../../styles/features/manage-booking/index.module.css";
import toastStyles from "../../styles/features/manage-booking/manage-toast.module.css";

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
  const [dialog, setDialog] = useState<"cancel" | "remove" | null>(null);
  const [isRescheduling, setRescheduling] = useState(false);
  const [confirming, setConfirming] = useState<Action | null>(null);

  const [editing, setEditing] = useState({
    on: false,
    draft: "",
    consent: false,
  });

  const [allergyError, setAllergyError] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [toast, setToast] = useState("");
  const toastTimer = useRef(0);

  const [cancelBooking, { isLoading: isCancelling }] =
    useCancelBookingMutation();

  const [saveAllergies, { isLoading: isSaving }] =
    useUpdateBookingAllergiesMutation();

  const stylist = booking.stylist_name;
  const isCancelled = booking.status === "cancelled";
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
    setDialog("cancel");
    onRefresh();
  };

  const startAction = (action: Action) =>
    booking.is_verified ? runAction(action) : setConfirming(action);

  const askForCode = (action: Action) => {
    setRescheduling(false);
    setDialog(null);
    setConfirming(action);
  };

  const updateAllergies = async (allergies: string, consent: boolean) => {
    setAllergyError("");

    try {
      await saveAllergies({ token, allergies, consent }).unwrap();
      setEditing({ on: false, draft: "", consent: false });
      setDialog(null);
      showToast(allergies ? "Saved" : "Removed");
    } catch (error) {
      setAllergyError(
        getErrorMessage(error) === "consent_required"
          ? `Tick the box to share this with ${stylist}.`
          : "We couldn't save that. Try again.",
      );
    }
  };

  const saveDraft = () => {
    const text = editing.draft.trim();

    if (text && !editing.consent) {
      setAllergyError(`Tick the box to share this with ${stylist}.`);

      return;
    }

    void updateAllergies(text, editing.consent);
  };

  const cancel = async () => {
    setCancelError("");

    try {
      await cancelBooking(token).unwrap();
      setDialog(null);
      showToast("Booking cancelled");
    } catch (error) {
      if (getErrorMessage(error) === "confirm_needed")
        return askForCode("cancel");

      setCancelError("We couldn't cancel your booking. Try again.");
    }
  };

  const { refund_pence: refunded, charge_pence: charge } = booking.cancellation;

  return (
    <>
      <div className={styles.eyebrow}>Your booking</div>
      <h1 className={styles.title}>{getTitle(isCancelled, isPast, stylist)}</h1>
      <BookingCard booking={booking} />
      {isCancelled && (
        <div className={styles.cancelledNote}>
          {!!refunded && (
            <p>{`${toPounds(refunded)} is refunded to your card. It can take 5 to 10 working days.`}</p>
          )}
          {!!charge && (
            <p>{`A ${toPounds(charge)} late cancellation fee is due under ${stylist}'s policy.`}</p>
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
      {!isCancelled && (
        <SharedDetails
          stylistName={stylist}
          allergies={booking.allergies ?? ""}
          isEditing={editing.on}
          draft={editing.draft}
          consent={editing.consent}
          error={dialog ? "" : allergyError}
          isSaving={isSaving}
          onEdit={() => {
            setAllergyError("");

            setEditing({
              on: true,
              draft: booking.allergies ?? "",
              consent: false,
            });
          }}
          onRemove={() => {
            setAllergyError("");
            setDialog("remove");
          }}
          onDraft={(draft) => setEditing((current) => ({ ...current, draft }))}
          onConsent={() =>
            setEditing((current) => ({ ...current, consent: !current.consent }))
          }
          onSave={saveDraft}
          onCancel={() => {
            setAllergyError("");
            setEditing({ on: false, draft: "", consent: false });
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
      {dialog === "cancel" && (
        <ConfirmDialog
          title="Cancel this booking?"
          lines={getCancelLines(booking, booking.cancellation)}
          cancelLabel="Keep booking"
          confirmLabel={isCancelling ? "Cancelling…" : "Cancel booking"}
          isBusy={isCancelling}
          error={cancelError}
          onCancel={() => setDialog(null)}
          onConfirm={() => void cancel()}
        />
      )}
      {dialog === "remove" && (
        <ConfirmDialog
          title="Remove this?"
          lines={[`${stylist} won’t see it any more.`]}
          cancelLabel="Cancel"
          confirmLabel="Remove"
          isBusy={isSaving}
          error={allergyError}
          onCancel={() => setDialog(null)}
          onConfirm={() => void updateAllergies("", false)}
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
