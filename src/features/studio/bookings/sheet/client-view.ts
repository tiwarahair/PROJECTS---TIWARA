import { getClient } from "../../core/model";
import type { StudioState } from "../../core/types";
import type { SheetContext } from "./context";

const getSensitivities = (state: StudioState) => {
  const bookingClient = state.bookings.find(
    ({ id }) => id === state.sheetBookingId,
  )?.client;

  return bookingClient
    ? getClient(state, bookingClient).sensitivities || ""
    : "";
};

export const getClientView = ({
  state,
  setState,
  actions,
  booking,
  paymentMode,
}: SheetContext) => {
  const changeClient = () =>
    setState({ bookingStep: "changeclient", changeClientQuery: "" });

  return {
    sensitivities: getSensitivities(state),
    // client row: hover reveals change / walk-in unless a payment locks the client
    isClientLocked: paymentMode !== "none",
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
            setState(({ bookings }) => ({
              confirm: null,
              bookings: bookings.map((item) =>
                item.id === booking.id ? { ...item, client: null } : item,
              ),
            }));

            actions.showToast("Now a walk-in");
          },
        },
      }),
  };
};
