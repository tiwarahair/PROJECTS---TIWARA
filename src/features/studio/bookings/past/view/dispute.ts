import { formatMoney } from "../../../../../utils/money";
import { openDispute } from "../../../disputes/open";
import {
  getDisputeReason,
  getRespondBy,
  getTakenBack,
  isAnswerable,
} from "../../dispute-records";
import type { DisputeRecord } from "../../../core/types";
import type { PastContext } from "./context";

const getDisputeTag = ({ outcome, returned }: DisputeRecord) => {
  if (outcome === "won")
    return `Dispute won · ${formatMoney(returned, { pence: "always" })} returned`;

  if (outcome === "lost") return "Dispute lost";

  if (outcome === "accepted") return "Dispute accepted";

  return outcome === "submitted" ? "Dispute · evidence sent" : "";
};

/** a client's dispute on this booking: asks for evidence, then shows how it went. */
export const getDisputeView = ({
  studio,
  state: { selectedPastId },
  row: { dispute, remoteId, service, when, time },
  client: { name: clientName },
  firstName,
}: PastContext) => {
  if (!dispute || !remoteId)
    return { hasDispute: false, disputeTag: "" } as const;

  const isOpen = isAnswerable(dispute);

  return {
    hasDispute: isOpen,
    disputeTitle: `${firstName("Your client")} ${getDisputeReason(dispute.reason)}`,
    disputeBody: `${getTakenBack(dispute)} ${getRespondBy(dispute)}`.trim(),
    disputeTag: isOpen ? "" : getDisputeTag(dispute),
    respondToDispute: () =>
      openDispute(studio, {
        dispute,
        bookingId: remoteId,
        clientName,
        service,
        when: `${when} · ${time}`,
        fromPastId: selectedPastId,
      }),
  };
};
