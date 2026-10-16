import { getAvatarSrc } from "../../../core/format";
import type { PastContext } from "./context";

const getSinceLabel = ({ row, client }: PastContext) => {
  if (!row.client) return "";

  if (client.since) return ` · client since ${client.since}`;

  return client.area ? ` · ${client.area}` : "";
};

export const getClientView = (context: PastContext) => {
  const { state, actions, row, client } = context;
  const phone = (client.phone || "").replace(/\s/g, "");

  return {
    clientName: client.name || "Walk-in",
    imgSrc: getAvatarSrc(client),
    visitLabel: row.client
      ? (client.visits || 0) + (client.visits === 1 ? " visit" : " visits")
      : "Walk-in",
    sinceLabel: getSinceLabel(context),
    hasPhone: !!client.phone,
    hasEmail: !!client.email,
    hasContact: !!(client.phone || client.email),
    telHref: `tel:${phone}`,
    smsHref: `sms:${phone}`,
    mailHref: `mailto:${client.email || ""}`,
    canOpen: !!row.client,
    openClient: () => {
      if (row.client)
        actions.openSheet("cliView", {
          selectedClientId: row.client,
          clientFromPastId: state.selectedPastId,
        });
    },
  };
};
