import { SaveError } from "../../../../lib/studio-writes";
import {
  getConfirmUrl,
  setBookingAddress,
  setStylistNote,
} from "../../../../lib/studio-api/booking-writes";
import { copyLaterText } from "../../core/format";
import { STILL_SAVING } from "./checkout-view";
import type { SheetContext } from "./context";

const getCopyError = (error: unknown) =>
  error instanceof SaveError
    ? error.message
    : "Couldn’t copy the link. Try again.";

export const getPanelsView = ({
  state,
  setState,
  actions: { showToast },
  raw,
  booking,
  saveBooking,
  resendLink,
}: SheetContext) => ({
  // awaiting confirmation
  resend: () => {
    if (booking.canResend) resendLink();
  },
  copyPaymentLink: () => {
    if (!raw?.remoteId) return showToast(STILL_SAVING);

    copyLaterText(getConfirmUrl(raw.remoteId)).then(
      () => showToast(`Link copied. Send it to ${booking.firstName} yourself.`),
      (error: unknown) => showToast(getCopyError(error)),
    );
  },
  // location (mobile stylists)
  toggleLocation: () => {
    if (!state.bookingAddressOn) {
      setState({
        bookingAddressOn: true,
        bookingAddressDraft: booking.address,
      });

      return;
    }

    const address = state.bookingAddressDraft.trim();

    setState({ bookingAddressOn: false });

    if (address === (raw?.address ?? "")) return;

    saveBooking({ address }, (remoteId) =>
      setBookingAddress(remoteId, address),
    );

    showToast(address ? "Address updated" : "Address removed");
  },
  // the stylist's own note
  saveNote: () => {
    const note = state.bookingNoteDraft.trim();

    saveBooking({ stylistNote: note }, (remoteId) =>
      setStylistNote(remoteId, note),
    );

    setState({ bookingNoteOn: false });
    showToast(note ? "Note saved" : "Note removed");
  },
});
