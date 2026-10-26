// The client's confirm page for a booking a stylist made: "view" shows it, "pay" starts the same payment online
// checkout takes (deposit + fee, full + fee, or the fee with the card saved), Turnstile-checked.
import { z } from "npm:zod@4";
import { admin } from "../_shared/admin.ts";
import { getClientIp } from "../_shared/client-ip.ts";
import { corsHeaders, respond } from "../_shared/cors.ts";
import { isWithinLimit } from "../_shared/rate-limit.ts";
import { isHuman } from "../_shared/turnstile.ts";
import { paysStylist } from "../booking-checkout/payment-params.ts";
import { getConfirmCustomer, getConfirmIntent } from "./stripe-payment.ts";
import type { ConfirmQuote } from "./stripe-payment.ts";

const CONFIRM_ERRORS = [
  "link_not_valid",
  "already_confirmed",
  "confirm_link_changed",
  "link_expired",
  "booking_unavailable",
];

const requestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("view"), token: z.string().min(1).max(100) }),
  z.object({
    action: z.literal("pay"),
    token: z.string().min(1).max(100),
    turnstileToken: z.string().min(1).max(2048),
  }),
]);

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) return respond(400, { error: "invalid_request" });

  const clientIp = getClientIp(request);

  try {
    if (!(await isWithinLimit(`booking-confirm:${clientIp}`, 30, 600))) return respond(429, { error: "rate_limited" });

    if (parsed.data.action === "view") {
      const { data, error } = await admin.rpc("get_booking_confirmation", { token: parsed.data.token });

      if (error) throw error;

      return data ? respond(200, data) : respond(404, { error: "link_not_valid" });
    }

    if (!(await isHuman(parsed.data.turnstileToken, clientIp))) return respond(403, { error: "turnstile_failed" });

    const { data, error } = await admin.rpc("start_booking_confirmation", { token: parsed.data.token });

    if (error && CONFIRM_ERRORS.includes(error.message)) return respond(409, { error: error.message });

    if (error) throw error;

    const quote = data as ConfirmQuote;

    if (paysStylist(quote.mode) && !quote.stylist_account) return respond(409, { error: "booking_unavailable" });

    const customerId = await getConfirmCustomer(quote);
    const intent = await getConfirmIntent(quote, customerId);

    if (intent.status === "processing") return respond(409, { error: "payment_processing" });

    if (intent.status === "succeeded") return respond(409, { error: "already_confirmed" });

    const { data: saved, error: saveError } = await admin
      .from("bookings")
      .update({ stripe_payment_intent_id: intent.id, stripe_customer_id: customerId })
      .eq("id", quote.id)
      .eq("status", "awaiting_confirmation")
      .eq("protection_status", "pending")
      .eq("confirm_sent_at", quote.confirm_sent_at)
      .select("id");

    if (saveError) throw saveError;

    if (!saved.length) return respond(409, { error: "booking_unavailable" });

    return respond(200, { clientSecret: intent.client_secret });
  } catch (error) {
    console.error("booking-confirm failed", error instanceof Error ? error.message : error);

    return respond(500, { error: "unknown" });
  }
});
