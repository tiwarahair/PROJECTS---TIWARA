import { CLIENTS } from "../../core/seed-clients";
import { getAvatarSrc } from "../../core/format";
import { getProtectionNoun } from "../../core/model";
import type { StudioBooking } from "../../core/types";
import { getFreshLink } from "./booking";
import type { SheetContext } from "./context";

const NO_PROTECTION: Partial<StudioBooking> = {
  protect: "none",
  paid: "none",
  status: "confirmed",
};

const getVisitsMeta = ({ visits, area }: { visits?: number; area?: string }) =>
  (visits || 0) +
  (visits === 1 ? " visit" : " visits") +
  (area ? ` · ${area}` : "");

export const getChangeClientView = (context: SheetContext) => {
  const { state, setState, actions, memo, booking } = context;
  const changeQuery = (state.changeClientQuery || "").trim();
  const lowerQuery = changeQuery.toLowerCase();
  const everyone = CLIENTS.concat(state.extraClients);

  const applyClient = (
    clientId: string | null,
    patch: Partial<StudioBooking>,
  ) => {
    setState({ bookingStepOut: true });

    window.setTimeout(
      () =>
        setState(({ bookings }) => ({
          bookingStepOut: false,
          bookingStep: "view",
          bookingStepBack: true,
          confirm: null,
          bookings: bookings.map((item) =>
            item.id === booking.id
              ? { ...item, client: clientId, ...patch }
              : item,
          ),
        })),
      200,
    );

    window.setTimeout(() => setState({ bookingStepBack: false }), 900);
  };

  const setClient = (clientId: string | null) => {
    if (!clientId || state.policy.mode === "none") {
      applyClient(clientId, NO_PROTECTION);

      return;
    }

    const other = everyone.find(({ id }) => id === clientId);
    const name = other ? (other.name.split(" ")[0] ?? "") : "the client";
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
    canAddTyped:
      changeQuery.length > 1 &&
      !everyone.some(({ name }) => name.toLowerCase() === lowerQuery),
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
    addTypedClient: () => {
      const id = `c${Date.now()}`;

      setState(({ extraClients }) => ({
        extraClients: extraClients.concat([
          {
            id,
            name: changeQuery,
            first: changeQuery.split(" ")[0],
            img: "",
            area: "",
            visits: 0,
            since: "today",
            spent: 0,
            phone: "",
            email: "",
          },
        ]),
      }));

      setClient(id);
      actions.showToast(`${changeQuery} added`);
    },
    makeWalkIn: () => setClient(null),
  };
};
