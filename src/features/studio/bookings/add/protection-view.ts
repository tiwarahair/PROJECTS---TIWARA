import { dayInfo, formatDateTime } from "../../core/format";
import {
  getProtectionExpiry,
  getProtectionNoun,
  getProtectionTotal,
} from "../../core/model";
import { formatMoney } from "../../../../utils/money";
import { bookingFee } from "../../../../utils/pricing";
import { toEditDraft } from "../../clients/edit-draft";
import type { AddContext } from "./context";

const getProtectedFirst = ({
  state,
  client,
  clientFirst,
  addNew,
}: AddContext) => {
  if (state.addWalkIn) return "the client";

  if (client) return clientFirst;

  if (addNew?.name) return addNew.name.trim().split(" ")[0] ?? "";

  return "the client";
};

const getLinkSubtitle = (
  isTooLate: boolean,
  mode: string,
  first: string,
  totalLabel: string,
  feeLabel: string,
) => {
  if (isTooLate)
    return "Not available: the start is less than 2 hours away, so there isn’t time to confirm.";

  return mode === "card"
    ? `${first} accepts your policy, saves a card and pays the ${feeLabel} booking fee to confirm.`
    : `${first} accepts your policy and pays ${totalLabel} to confirm.`;
};

// ---- step 4: protection ----
export const getProtectionView = (context: AddContext) => {
  const { state, setState, actions, client, price, isLinkTooLate } = context;
  const { mode, window: policyWindow } = state.policy;
  const first = getProtectedFirst(context);
  const salon = state.profile.salon || "your stylist";

  const feeLabel = formatMoney(bookingFee(Math.max(0, price)), {
    pence: "always",
  });

  const totalLabel = formatMoney(
    getProtectionTotal(state, Math.max(0, price)),
    {
      pence: "always",
    },
  );

  const when =
    state.addDay != null && state.addTime
      ? `${dayInfo(state.addDay).label}, ${state.addTime}`
      : "your appointment";

  const paidFor =
    mode === "full"
      ? " (full price + booking fee)"
      : " (deposit + booking fee)";

  const isSend = state.addProtection === "link" && !isLinkTooLate;

  const expiry = formatDateTime(
    getProtectionExpiry(Date.now(), state.addDay, state.addTime),
  );

  return {
    protectionNoun: getProtectionNoun(state),
    isProtectionSend: isSend,
    protectionFootnote: isSend
      ? `Not confirmed in time? It auto-cancels on ${expiry} — 48 hrs from now, or 2 hrs before the start, whichever is first — and the slot is released.`
      : "The booking is confirmed straight away, and no cancellation or no-show fee can be charged on it.",
    protectionPreview:
      mode === "card"
        ? `Email: “Confirm your appointment with ${salon} on ${when}. Add a card and pay the ${feeLabel} booking fee to confirm. Cancellation policy: free up to ${policyWindow} hrs before.” With a Confirm my appointment link.`
        : `Email: “Confirm your appointment with ${salon} on ${when}. Pay ${totalLabel}${paidFor} to confirm. Cancellation policy: free up to ${policyWindow} hrs before.” With a Confirm my appointment link.`,
    protectionOptions: [
      {
        id: "link",
        label: "Send payment link",
        subtitle: getLinkSubtitle(
          isLinkTooLate,
          mode,
          first,
          totalLabel + paidFor,
          feeLabel,
        ),
      },
      {
        id: "none",
        label: "No protection for this booking",
        subtitle:
          "Confirmed straight away. It won't be protected against cancellations or no-shows.",
      },
    ].map(({ id, label, subtitle }) => {
      const isOff = id === "link" && isLinkTooLate;

      return {
        key: id,
        label,
        subtitle,
        isOff,
        isOn: isLinkTooLate ? id === "none" : state.addProtection === id,
        pick: () => {
          if (!isOff) setState({ addProtection: id });
        },
      };
    }),
    firstName:
      state.addWalkIn || !context.client ? "the client" : context.clientFirst,
    emailNotice: context.isEmailNeeded
      ? `${first} has no email yet. The link is sent by email.`
      : "",
    // the client's own edit sheet, which comes back here once saved
    addEmail: () =>
      actions.openSheet("clientEdit", {
        clientEdit: toEditDraft(client),
        clientEditFromAdd: true,
        clientEditFocus: "email",
      }),
  };
};
