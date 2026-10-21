import { changeBookingClient } from "../../../../lib/studio-api/booking-writes";
import { getAvatarSrc } from "../../core/format";
import {
  getAllClients,
  getClient,
  getClientNames,
  getProtectionNoun,
} from "../../core/model";
import type { StudioBooking } from "../../core/types";
import { toEditDraft } from "../../clients/edit-draft";
import { getFreshLink } from "./booking";
import type { SheetContext } from "./context";

const toContact = (state: SheetContext["state"], clientId: string) => {
  const client = getClient(state, clientId);

  return {
    ...getClientNames(client),
    phone: client.phone || "",
    email: client.email || "",
  };
};

const NO_PROTECTION: Partial<StudioBooking> = {
  protect: "none",
  paid: "none",
  status: "confirmed",
};

const getVisitsMeta = ({ visits, area }: { visits?: number; area?: string }) =>
  (visits || 0) +
  (visits === 1 ? " visit" : " visits") +
  (area ? ` · ${area}` : "");

// ---- change client ----
export const getChangeClientView = (context: SheetContext) => {
  const { state, setState, actions, memo, booking, hoursToStart, saveBooking } =
    context;

  const changeQuery = (state.changeClientQuery || "").trim();
  const lowerQuery = changeQuery.toLowerCase();
  const everyone = getAllClients(state);

  const applyClient = (
    clientId: string | null,
    patch: Partial<StudioBooking>,
  ) => {
    setState({ bookingStepOut: true });

    window.setTimeout(() => {
      setState({
        bookingStepOut: false,
        bookingStep: "view",
        bookingStepBack: true,
        confirm: null,
      });

      saveBooking(
        { client: clientId, walkIn: !clientId, ...patch },
        (remoteId) =>
          changeBookingClient(
            remoteId,
            clientId ? toContact(state, clientId) : null,
            patch.protect === "link",
          ),
      );
    }, 200);

    window.setTimeout(() => setState({ bookingStepBack: false }), 900);
  };

  const setClient = (clientId: string | null) => {
    // the client needs until 2 hours before the start to confirm
    const other = everyone.find(({ id }) => id === clientId);

    if (
      !clientId ||
      !other ||
      state.policy.mode === "none" ||
      hoursToStart <= 2
    ) {
      applyClient(clientId, NO_PROTECTION);

      return;
    }

    const name = other.name.split(" ")[0] ?? "";

    // the confirm link goes by email
    if (!other.email?.trim()) {
      setState({
        confirm: {
          title: `${name} has no email yet`,
          yesLabel: "Add email",
          noLabel: "No protection",
          body: `The payment link is sent by email. Add ${name}’s email to ask for booking protection, or change the client without it.`,
          yes: () =>
            actions.openSheet("clientEdit", {
              confirm: null,
              clientEdit: toEditDraft(other),
              clientEditFromBooking: {
                bookingId: booking.id,
                clientId,
                fromClientId: state.fromClientId ?? null,
              },
              clientEditFocus: "email",
            }),
          onNo: () => applyClient(clientId, NO_PROTECTION),
          isBlocking: true,
        },
      });

      return;
    }

    const sentAt = Date.now();

    setState({
      confirm: {
        title: `Ask ${name} for booking protection?`,
        yesLabel: "Send a link",
        noLabel: "No protection",
        body: `Protection was agreed with the previous client, so it does not carry over. Sending a link asks ${name} for ${getProtectionNoun(state)}; the booking waits 48 hrs to be confirmed.`,
        yes: () =>
          applyClient(clientId, {
            protect: "link",
            paid: "link",
            status: "awaiting",
            protectionMode: state.policy.mode,
            resends: 0,
            ...getFreshLink(booking, sentAt),
          }),
        onNo: () => applyClient(clientId, NO_PROTECTION),
        isBlocking: true,
      },
    });
  };

  memo.setChangeClient = setClient;

  return {
    changeRows: everyone
      .filter(
        ({ name }) => !lowerQuery || name.toLowerCase().includes(lowerQuery),
      )
      .map((client) => ({
        key: client.id ?? "",
        name: client.name,
        imgSrc: getAvatarSrc(client),
        meta: getVisitsMeta(client),
        isCurrent: client.id === booking.client,
        pick: () => setClient(client.id),
      })),
    openNewClient: () => {
      const parts = changeQuery.split(" ");

      setState({
        newClient: {
          first: parts[0] || "",
          last: parts.slice(1).join(" "),
          email: "",
          phone: "",
        },
      });
    },
    makeWalkIn: () => setClient(null),
  };
};
