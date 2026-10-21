import { changeBookingClient } from "../../../../lib/studio-api/booking-writes";
import { formatMoney } from "../../../../utils/money";
import { getClient } from "../../core/model";
import type { StudioState } from "../../core/types";
import type { SheetContext } from "./context";
import { CANCEL_STEP } from "./types";

// what locks the client: their payment, or the card they saved
const getLockedBody = ({ booking }: SheetContext) => {
  const amounts: Record<string, number> = {
    full: booking.price,
    deposit: booking.depositAmount,
  };

  const paid = amounts[booking.paidKind] ?? 0;
  const noun = booking.paidKind === "full" ? "payment" : "deposit";

  const what = paid
    ? `paid a ${formatMoney(paid, { pence: "auto" })} ${noun}`
    : "saved a card for this booking";

  return `${booking.firstName} ${what}. Cancel this booking to refund or keep it, then create a new one.`;
};

const getBookingClient = (state: StudioState) => {
  const bookingClient = state.bookings.find(
    ({ id }) => id === state.sheetBookingId,
  )?.client;

  return bookingClient ? getClient(state, bookingClient) : null;
};

export const getClientView = (context: SheetContext) => {
  const { state, setState, actions, booking, paymentMode, saveBooking } =
    context;

  const isClientLocked = paymentMode !== "none" || !!booking.clientLocked;

  const changeClient = () => {
    if (!isClientLocked) {
      setState({ bookingStep: "changeclient", changeClientQuery: "" });

      return;
    }

    setState({
      confirm: {
        title: "The client can’t be changed",
        yesLabel: "Cancel booking",
        noLabel: "Keep booking",
        body: getLockedBody(context),
        yes: () => setState({ confirm: null, ...CANCEL_STEP }),
      },
    });
  };

  return {
    sensitivities: getBookingClient(state)?.sensitivities || "",
    hairNotes: getBookingClient(state)?.notes?.products || "",
    // client row: hover reveals change / walk-in; once the client paid, change explains why it can't
    isClientLocked,
    openClient: () => {
      if (!booking.client) return changeClient();

      actions.openSheet("cliView", {
        selectedClientId: booking.client,
        clientAppointmentsTab: "up",
        clientFromBookingId: booking.id,
      });
    },
    changeClient,
    clearClient: () =>
      setState({
        confirm: {
          title: "Make this a walk-in?",
          yesLabel: "Make walk-in",
          noLabel: "Keep client",
          body: `The appointment stays in your calendar with no client attached. ${booking.firstName} will not get reminders for it.`,
          yes: () => {
            setState({ confirm: null });

            // a walk-in has nothing to confirm: any link stops working
            saveBooking(
              {
                client: null,
                walkIn: true,
                status: booking.awaiting ? "confirmed" : booking.status,
                paid: "none",
                protect: undefined,
                expiresAt: undefined,
                linkAmount: undefined,
              },
              (remoteId) => changeBookingClient(remoteId, null, false),
            );

            actions.showToast("Now a walk-in");
          },
        },
      }),
  };
};
