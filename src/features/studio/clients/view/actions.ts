import { dateLabel } from "../../core/format";
import type { StudioBooking, StudioClient } from "../../core/types";
import { getFirstName } from "./context";
import type { ClientsContext } from "./context";

export const createClientActions = ({
  studio,
  state,
  setState,
  actions,
  setOverride,
  getStats,
}: ClientsContext) => {
  const { openSheet, showToast, closeSheet } = actions;

  const openEdit = (client: StudioClient | null) => {
    const notes = client?.notes || {};
    const parts = client ? client.name.split(" ") : [""];

    openSheet("clientEdit", {
      clientEditFromView: state.sheet === "cliView" && !!client,
      clientEdit: {
        id: client ? client.id : null,
        first: client ? (parts[0] ?? "") : "",
        last: client ? parts.slice(1).join(" ") : "",
        phone: client ? client.phone || "" : "",
        email: client ? client.email || "" : "",
        type: notes.type || "",
        size: notes.size || "",
        length: notes.length || "",
        products: notes.products || "",
        sensitivities: client ? client.sensitivities || "" : "",
      },
    });
  };

  const block = (client: StudioClient) => {
    const first = getFirstName(client);

    if (client.blocked) {
      setOverride(client.id, { blocked: false });

      showToast(`${first} can book online again`, () =>
        setOverride(client.id, { blocked: true }),
      );

      return;
    }

    setState({
      confirm: {
        title: `Block ${first} from booking online?`,
        body: `${first} won’t be notified. You can still book them yourself, and their profile and history stay.`,
        yesLabel: "Block",
        noLabel: "Cancel",
        yes: () => {
          setState({ confirm: null });
          setOverride(client.id, { blocked: true });

          showToast(`${first} blocked from online booking`, () =>
            setOverride(client.id, { blocked: false }),
          );
        },
      },
    });
  };

  const remove = (client: StudioClient) => {
    const first = getFirstName(client);
    const stats = getStats(client.id);

    if (stats.upcoming.length) {
      const booking = stats.upcoming[0] as StudioBooking;
      const bookingDate = dateLabel(booking.dayOffset || 0);

      const upcomingNote =
        stats.upcoming.length === 1
          ? `${first} has a booking on ${bookingDate} at ${booking.time}. Cancel it`
          : `${first} has ${stats.upcoming.length} upcoming bookings. Cancel them`;

      setState({
        confirm: {
          title: `Cancel ${first}’s upcoming booking first`,
          body: `${upcomingNote}, then you can delete this client.`,
          yesLabel: "View booking",
          noLabel: "Close",
          yes: () => {
            setState({ confirm: null });
            openSheet("booking", { sheetBookingId: booking.id });
          },
        },
      });

      return;
    }

    if (stats.unpaidFee) {
      setState({
        confirm: {
          title: `Settle ${first}’s fee first`,
          body: "A cancellation fee is still pending. Waive it or let it charge, then you can delete this client.",
          yesLabel: "View appointments",
          noLabel: "Close",
          yes: () => setState({ confirm: null, clientAppointmentsTab: "past" }),
        },
      });

      return;
    }

    const blockNote = client.blocked
      ? " Deleting also removes the block, so they could book online again. Keep them blocked instead if you don’t want that."
      : "";

    setState({
      confirm: {
        title: `Delete ${first}?`,
        body: `This can’t be undone. ${first}’s details will be removed permanently.${blockNote}`,
        yesLabel: "Delete client",
        noLabel: "Keep client",
        yes: () => {
          if (studio.context.getState().sheet === "cliView") closeSheet();

          setState({ confirm: null, selectedClientId: null });
          setOverride(client.id, { deleted: true, blocked: false });
          showToast("Client deleted");
        },
      },
    });
  };

  return { openEdit, block, remove };
};

export type ClientActions = ReturnType<typeof createClientActions>;
