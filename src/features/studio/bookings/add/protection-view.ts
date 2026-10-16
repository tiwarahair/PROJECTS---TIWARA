import { dayInfo, formatDateTime } from "../../core/format";
import {
  getProtectionExpiry,
  getProtectionNoun,
  getProtectionTotal,
} from "../../core/model";
import { formatMoney } from "../../../../utils/money";
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

// ---- step 4: protection ----
export const getProtectionView = (context: AddContext) => {
  const { state, setState, price } = context;
  const { mode, window: policyWindow } = state.policy;
  const first = getProtectedFirst(context);

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

  const chargeNoun = mode === "full" ? " payment" : " deposit";
  const isSend = state.addProtection === "link";

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
        ? `Email and SMS: “Confirm your appointment with Tiwára's House on ${when}. Card details are required to hold the slot, with nothing charged now. Cancellation policy: free up to ${policyWindow} hrs before.” With a Confirm & save card link.`
        : `Email and SMS: “Confirm your appointment with Tiwára's House on ${when}. A ${totalLabel}${chargeNoun} is required. Cancellation policy: free up to ${policyWindow} hrs before.” With a Confirm & pay link.`,
    protectionOptions: [
      {
        id: "link",
        label: "Send payment link",
        subtitle:
          mode === "card"
            ? `${first} accepts your policy and saves a card to confirm. Nothing is charged now.`
            : `${first} accepts your policy and pays ${totalLabel}${paidFor} to confirm.`,
      },
      {
        id: "none",
        label: "No protection for this booking",
        subtitle:
          "Confirmed straight away. It won't be protected against cancellations or no-shows.",
      },
    ].map(({ id, label, subtitle }) => ({
      key: id,
      label,
      subtitle,
      isOn: state.addProtection === id,
      pick: () => setState({ addProtection: id }),
    })),
    firstName:
      state.addWalkIn || !context.client ? "the client" : context.clientFirst,
  };
};
