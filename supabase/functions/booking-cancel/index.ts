import { z } from "npm:zod@4";
import { admin } from "../_shared/admin.ts";
import { getClientIp } from "../_shared/client-ip.ts";
import { corsHeaders, respond } from "../_shared/cors.ts";
import { isWithinLimit } from "../_shared/rate-limit.ts";
import { stripe } from "../_shared/stripe.ts";

const ERRORS: Record<string, number> = { link_not_valid: 404, cannot_cancel: 409 };

const requestSchema = z.object({ token: z.string().min(1).max(100) });

interface Cancellation {
  id: string;
  payment_intent_id: string | null;
  refund_pence: number;
  kept_pence: number;
  charge_pence: number;
}

const refund = async ({ id, payment_intent_id: paymentIntentId, refund_pence: amount }: Cancellation) => {
  if (!amount || !paymentIntentId) return null;

  const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

  const { id: refundId } = await stripe.refunds.create(
    {
      payment_intent: paymentIntentId,
      amount,
      metadata: { booking_id: id, reason: "client_cancelled" },
      ...(intent.transfer_data ? { reverse_transfer: true } : {}),
    },
    { idempotencyKey: `booking:${id}:cancel-refund` },
  );

  return refundId;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) return respond(400, { error: "invalid_request" });

  const { token } = parsed.data;

  try {
    if (!(await isWithinLimit(`booking-cancel:${getClientIp(request)}`, 20, 600)))
      return respond(429, { error: "rate_limited" });

    const { data, error } = await admin.rpc("get_cancellation", { token });

    if (error && ERRORS[error.message]) return respond(ERRORS[error.message], { error: error.message });

    if (error) throw error;

    const cancellation = data as Cancellation;
    const refundId = await refund(cancellation);

    const { error: cancelError } = await admin.rpc("cancel_managed_booking", {
      token,
      cancellation: { ...cancellation, refund_id: refundId },
    });

    if (cancelError) throw cancelError;

    const { refund_pence, kept_pence, charge_pence } = cancellation;

    return respond(200, { refund_pence, kept_pence, charge_pence });
  } catch (error) {
    console.error("booking-cancel failed", error instanceof Error ? error.message : error);

    return respond(500, { error: "unknown" });
  }
});
