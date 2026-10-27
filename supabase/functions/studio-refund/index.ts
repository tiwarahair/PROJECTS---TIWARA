// Studio's discretionary refund: needs a recent 2FA code; refunds fee charges first, then the booking payment.
import { z } from "npm:zod@4";
import { admin } from "../_shared/admin.ts";
import { corsHeaders, respond } from "../_shared/cors.ts";
import { reverseLaterTransfer } from "../_shared/later-transfer.ts";
import { getRecentUser } from "../_shared/recent-user.ts";
import { stripe } from "../_shared/stripe.ts";

const requestSchema = z.object({
  bookingId: z.uuid(),
  amountPence: z.number().int().positive(),
  reason: z.string().max(500),
});

interface RefundSource {
  payment_intent_id: string;
  stylist_share_pence: number;
}

interface RefundPart {
  intentId: string;
  amount: number;
  isTransferred: boolean;
}

// only the stylist's share goes back from Studio: never the platform's booking fee
const getRefundable = async ({ payment_intent_id: intentId, stylist_share_pence: share }: RefundSource) => {
  const intent = await stripe.paymentIntents.retrieve(intentId, { expand: ["latest_charge"] });
  const charge = intent.latest_charge;
  const refunded = typeof charge === "object" && charge ? charge.amount_refunded : share;

  return { available: Math.max(0, share - refunded), isTransferred: !!intent.transfer_data };
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const owner = await getRecentUser(admin, request);

  if (!owner) return respond(403, { error: "second_factor_needed" });

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) return respond(400, { error: "invalid_request" });

  const { bookingId, amountPence, reason } = parsed.data;

  try {
    const { data, error } = await admin.rpc("get_refund_sources", { target_booking: bookingId, owner });

    if (error) throw error;

    const sources = (data ?? []) as RefundSource[];
    let left = amountPence;
    const plan: RefundPart[] = [];

    for (const source of sources) {
      if (!left) break;

      const { available, isTransferred } = await getRefundable(source);
      const amount = Math.min(left, available);

      if (amount > 0) {
        plan.push({ intentId: source.payment_intent_id, amount, isTransferred });
        left -= amount;
      }
    }

    if (!sources.length) return respond(404, { error: "not_found" });

    if (left > 0) return respond(409, { error: "more_than_refundable" });

    // keyed by what has been refunded so far, so a retried request doesn't refund twice
    const { count } = await admin.from("refunds").select("id", { count: "exact", head: true }).eq("booking_id", bookingId);

    let refunded = 0;

    for (const [index, { intentId, amount, isTransferred }] of plan.entries()) {
      // a later part failing leaves the earlier ones made; say how much went back, so a retry asks for the rest
      const refund = await stripe.refunds
        .create(
        {
          payment_intent: intentId,
          amount,
          metadata: { booking_id: bookingId, reason: "manual" },
          ...(isTransferred ? { reverse_transfer: true } : {}),
        },
          { idempotencyKey: `manual-refund:${bookingId}:${count ?? 0}:${index}:${amount}` },
        )
        .catch((refundError) => {
          console.error("studio-refund part failed", refundError instanceof Error ? refundError.message : refundError);

          return null;
        });

      if (!refund) return respond(refunded ? 200 : 500, refunded ? { refunded_pence: refunded } : { error: "unknown" });

      refunded += amount;

      const { error: saveError } = await admin
        .from("refunds")
        .upsert(
          { booking_id: bookingId, amount_pence: amount, reason: "manual", note: reason || null, stripe_refund_id: refund.id },
          { onConflict: "stripe_refund_id" },
        );

      if (saveError) throw saveError;

      if (!isTransferred) await reverseLaterTransfer(intentId, refund);
    }

    return respond(200, { refunded_pence: refunded });
  } catch (error) {
    console.error("studio-refund failed", error instanceof Error ? error.message : error);

    return respond(500, { error: "unknown" });
  }
});
