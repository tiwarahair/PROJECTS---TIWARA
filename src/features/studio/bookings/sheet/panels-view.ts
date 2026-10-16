import { copyText } from "../../core/format";
import type { SheetContext } from "./context";

export const getPanelsView = ({
  state,
  setState,
  actions: { showToast },
  booking,
  patchBooking,
  resendLink,
}: SheetContext) => ({
  // awaiting confirmation
  resend: () => {
    if (booking.canResend) resendLink();
  },
  copyPaymentLink: () => {
    copyText(`tiwaras.house/pay/${booking.id}`);
    showToast("Payment link copied");
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

    setState({
      bookingAddressOn: false,
      clientAddresses: {
        ...state.clientAddresses,
        [booking.client ?? ""]: address,
      },
    });

    patchBooking({ address });

    showToast(
      address
        ? `Address saved to ${booking.firstName}’s profile`
        : "Address removed",
    );
  },
  // the stylist's own note
  saveNote: () => {
    const note = state.bookingNoteDraft.trim();

    patchBooking({ stylistNote: note });
    setState({ bookingNoteOn: false });
    showToast(note ? "Note saved" : "Note removed");
  },
});
