// Settles a claimed fee: refunds what goes back to the client, then charges the saved card for the rest of the fee.
import Stripe from "npm:stripe@22.6.2";
import { admin } from "./admin.ts";
import { getCardLabel, isHardDecline } from "./declines.ts";
import { getRefundable } from "./refundable.ts";
import { getFeeChargeKey, getFeeRefundKey } from "./stripe-keys.ts";
import { stripe } from "./stripe.ts";

export interface FeeSettlement {
  id: string;
  booking_id: string;
  kind: "late_cancel" | "no_show";
  refund_pence: number;
  refunded_pence: number;
  charge_pence: number;
  tries: number;
  reruns: number;
  status: string;
  waived_at: string | null;
  payment_intent_id: string | null;
  customer_id: string | null;
  payment_method_id: string | null;
  booking_ref: string;
  stylist_account: string | null;
  stylist_can_receive: boolean;
}

interface SettlementResult {
  outcome: "paid" | "unpaid" | "settled";
  refunded_pence: number;
  refund_id?: string;
  payment_intent_id?: string;
  transfer_pending?: boolean;
  hard_decline?: boolean;
  decline_message?: string;
  card_label?: string | null;
}

type ChargeResult = Omit<SettlementResult, "refunded_pence" | "refund_id">;

const KIND_LABELS = {
  late_cancel: "late cancellation fee",
  no_show: "no-show fee",
};

// refunds made for this fee that aren't recorded yet: a run that refunded, then failed before saving
const findUnrecordedRefund = async (fee: FeeSettlement, intentId: string) => {
  const { data } = await stripe.refunds.list({
    payment_intent: intentId,
    limit: 100,
  });

  const made = data.filter(
    ({ metadata, status }) =>
      metadata?.fee_id === fee.id &&
      status !== "failed" &&
      status !== "canceled",
  );

  let total = 0;

  for (const { amount } of made) total += amount;

  return total > fee.refunded_pence && made[0]
    ? { refund_id: made[0].id, refunded_pence: total - fee.refunded_pence }
    : null;
};

const refundRest = async (fee: FeeSettlement) => {
  if (!fee.refund_pence || !fee.payment_intent_id) return { refunded_pence: 0 };

  const unrecorded = await findUnrecordedRefund(fee, fee.payment_intent_id);

  if (unrecorded) return unrecorded;

  const intent = await stripe.paymentIntents.retrieve(fee.payment_intent_id, {
    expand: ["latest_charge"],
  });

  // no more than is still on the payment, so a refund Stripe would refuse isn't attempted
  const amount = Math.min(fee.refund_pence, getRefundable(intent.latest_charge));

  if (amount <= 0) return { refunded_pence: 0 };

  const { id } = await stripe.refunds.create(
    {
      payment_intent: fee.payment_intent_id,
      amount,
      metadata: {
        booking_id: fee.booking_id,
        fee_id: fee.id,
        reason: "fee_settled",
      },
      ...(intent.transfer_data ? { reverse_transfer: true } : {}),
    },
    { idempotencyKey: getFeeRefundKey(fee, amount) },
  );

  return { refund_id: id, refunded_pence: amount };
};

const getSavedCard = async (fee: FeeSettlement) => {
  if (fee.payment_method_id) return fee.payment_method_id;

  if (!fee.payment_intent_id) return null;

  const { payment_method: method } = await stripe.paymentIntents.retrieve(
    fee.payment_intent_id,
  );

  return typeof method === "string" ? method : (method?.id ?? null);
};

const chargeCard = async (fee: FeeSettlement): Promise<ChargeResult> => {
  const paymentMethod = await getSavedCard(fee);

  if (!fee.customer_id || !paymentMethod)
    return {
      outcome: "unpaid",
      hard_decline: true,
      decline_message: "No card was saved with this booking.",
    };

  const card = await stripe.paymentMethods.retrieve(paymentMethod);
  const cardLabel = getCardLabel(card.card?.brand, card.card?.last4);
  // the stylist gets the whole fee; if their account can't receive yet, it's sent on later
  const canTransfer = !!fee.stylist_account && fee.stylist_can_receive;

  // a run that charged, then failed before saving: keep that payment rather than charge again
  const { data: charged } = await stripe.paymentIntents.search({
    query: `metadata['fee_id']:'${fee.id}' AND status:'succeeded'`,
  });

  if (charged[0])
    return {
      outcome: "paid",
      payment_intent_id: charged[0].id,
      transfer_pending: !charged[0].transfer_data,
      card_label: cardLabel,
    };

  try {
    const intent = await stripe.paymentIntents.create(
      {
        amount: fee.charge_pence,
        currency: "gbp",
        customer: fee.customer_id,
        payment_method: paymentMethod,
        off_session: true,
        confirm: true,
        description: `${fee.booking_ref}: ${KIND_LABELS[fee.kind]}`,
        metadata: { kind: "fee", fee_id: fee.id, booking_id: fee.booking_id },
        ...(canTransfer
          ? { transfer_data: { destination: fee.stylist_account as string } }
          : {}),
      },
      { idempotencyKey: getFeeChargeKey(fee) },
    );

    return {
      outcome: "paid",
      payment_intent_id: intent.id,
      transfer_pending: !canTransfer,
      card_label: cardLabel,
    };
  } catch (error) {
    if (!(error instanceof Stripe.errors.StripeCardError)) throw error;

    return {
      outcome: "unpaid",
      hard_decline: isHardDecline(error.decline_code ?? error.code),
      decline_message: error.message,
      card_label: cardLabel,
    };
  }
};

export const settleFee = async (fee: FeeSettlement) => {
  const refund = await refundRest(fee);

  const charge: ChargeResult =
    fee.charge_pence > 0 ? await chargeCard(fee) : { outcome: "settled" };

  const result: SettlementResult = { ...refund, ...charge };

  const { error } = await admin.rpc("finish_fee_settlement", {
    target: fee.id,
    result,
  });

  if (error) throw error;

  return result;
};
