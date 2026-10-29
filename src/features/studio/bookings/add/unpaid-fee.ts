// The add-booking warning when the picked client still owes the stylist a fee (they can still be booked).
import { getClientUnpaidFee } from "../../../../lib/studio-api/booking-writes";
import { getClient } from "../../core/model";
import type { StudioState } from "../../core/types";
import { formatMoney, toPounds } from "../../../../utils/money";
import type { AddContext } from "./context";

const FEE_NAMES: Record<string, string> = {
  late_cancel: "late cancellation fee",
  no_show: "no-show fee",
};

// look up the client & check if they have an unpaid fee by looking at their email then ohone number
export const checkUnpaidFee = (
  getState: () => StudioState,
  setState: (patch: Partial<StudioState>) => void,
  clientId: string,
) => {
  const state = getState();
  const { stylistId } = state.account;

  setState({ addUnpaidFee: null });

  if (!stylistId) return;

  const { email, phone } = getClient(state, clientId);

  void getClientUnpaidFee(stylistId, email || "", phone || "").then(
    (fee) => {
      if (fee && getState().addClient === clientId)
        setState({
          addUnpaidFee: {
            bookingId: fee.booking_id,
            amount: toPounds(fee.amount_pence),
            kind: fee.kind,
          },
        });
    },
    () => undefined,
  );
};

// "Ruth owes you a £35.00 no-show fee"
export const getUnpaidFeeView = ({
  state,
  actions,
  clientFirst,
}: AddContext) => {
  const fee = state.addStep >= 2 && state.addClient ? state.addUnpaidFee : null;

  const isLoaded =
    !!fee && state.pastNew.some(({ pastId }) => pastId === fee.bookingId);

  return {
    unpaidFeeNote: fee
      ? `${clientFirst || "This client"} owes you a ${formatMoney(fee.amount, { pence: "always" })} ${FEE_NAMES[fee.kind] ?? "fee"}. You can still book them.`
      : "",
    openUnpaidFee:
      fee && isLoaded
        ? () => actions.openSheet("past", { selectedPastId: fee.bookingId })
        : null,
  };
};
