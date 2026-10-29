// cancelling from Studio: the stylist cancelling refunds the client everything, the booking fee included;
import { z } from "zod";
import { admin } from "../_shared/admin.ts";
import { corsHeaders, respond } from "../_shared/cors.ts";
import { getStudioUser } from "../_shared/recent-user.ts";
import { getRefundNow } from "../_shared/cancel-refund.ts";
import { refundCancellation } from "../_shared/refund.ts";

const ERRORS: Record<string, number> = { not_found: 404, cannot_cancel: 409 };

const requestSchema = z.object({
  bookingId: z.uuid(),
  who: z.enum(["stylist", "client"]),
  waiveFee: z.boolean(),
  reason: z.string().max(500),
});

interface Cancellation {
  id: string;
  payment_intent_id: string | null;
  refund_pence: number;
  kept_pence: number;
  charge_pence: number;
  fee_pence: number;
  resume?: boolean;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const owner = await getStudioUser(admin, request);

  if (!owner) return respond(401, { error: "signed_out" });

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) return respond(400, { error: "invalid_request" });

  const { bookingId, who, waiveFee, reason } = parsed.data;

  try {
    const { data, error } = await admin.rpc("get_studio_cancellation", {
      target: bookingId,
      owner,
      who,
      waive_fee: waiveFee,
    });

    if (error && ERRORS[error.message]) return respond(ERRORS[error.message], { error: error.message });

    if (error) throw error;

    const cancellation = data as Cancellation;
    const refundNow = getRefundNow(cancellation);

    // cancelled first, so the client can't cancel it meanwhile; a refund that then fails is finished on a retry
    if (!cancellation.resume) {
      const { error: cancelError } = await admin.rpc("cancel_studio_booking", {
        target: bookingId,
        owner,
        who,
        reason,
        cancellation: {
          ...cancellation,
          id: undefined,
          payment_intent_id: undefined,
          refund_now_pence: refundNow,
        },
      });

      if (cancelError && ERRORS[cancelError.message])
        return respond(ERRORS[cancelError.message], {
          error: cancelError.message,
        });

      if (cancelError) throw cancelError;
    }

    await refundCancellation({
      bookingId,
      paymentIntentId: cancellation.payment_intent_id,
      amount: refundNow,
      reason: who === "stylist" ? "stylist_cancelled" : "client_cancelled",
    });

    const { refund_pence, kept_pence, charge_pence } = cancellation;

    return respond(200, { refund_pence, kept_pence, charge_pence });
  } catch (error) {
    console.error("studio-booking-cancel failed", error instanceof Error ? error.message : error);

    return respond(500, { error: "unknown" });
  }
});
