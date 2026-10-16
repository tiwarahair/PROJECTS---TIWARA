import { admin } from "../_shared/admin.ts";
import { getClientIp } from "../_shared/client-ip.ts";
import { corsHeaders, respond } from "../_shared/cors.ts";
import { isWithinLimit } from "../_shared/rate-limit.ts";
import { getSite } from "../_shared/site.ts";
import { isHuman } from "../_shared/turnstile.ts";
import { savesCard } from "./payment-params.ts";
import type { CheckoutQuote } from "./payment-params.ts";
import { requestSchema } from "./request.ts";
import { getCustomerId, getPaymentIntent } from "./stripe-payment.ts";

const CHECKOUT_ERRORS = ["hold_not_found", "already_paid", "address_required", "outside_area"];

const getClientId = async (request: Request) => {
  const token = request.headers.get("Authorization")?.replace(/^Bearer /, "");
  const { data } = token ? await admin.auth.getUser(token) : { data: null };

  return data?.user?.id ?? null;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) return respond(400, { error: "invalid_request" });

  const { hold, contact, notes, allergies, address, turnstileToken } = parsed.data;
  const ip = getClientIp(request);

  try {
    if (!(await isWithinLimit(`booking-checkout:${ip}`, 20, 600))) return respond(429, { error: "rate_limited" });

    if (!(await isHuman(turnstileToken, ip))) return respond(403, { error: "turnstile_failed" });

    const clientId = await getClientId(request);
    const { lat, lng, ...addressLines } = address ?? {};

    const { data, error } = await admin.rpc("checkout_booking", {
      target: hold.id,
      secret: hold.secret,
      contact,
      notes,
      address: address ? addressLines : null,
      client_lat: lat ?? null,
      client_lng: lng ?? null,
      client: clientId,
    });

    if (CHECKOUT_ERRORS.includes(error?.message ?? "")) return respond(409, { error: error!.message });

    if (error) throw error;

    const quote = data as CheckoutQuote;
    const keepCard = parsed.data.keepCard && !!clientId;
    const customerId = savesCard(quote.mode) || clientId ? await getCustomerId(quote, contact, clientId) : null;
    const intent = await getPaymentIntent(quote, customerId, keepCard);

    if (intent.status === "succeeded") return respond(409, { error: "already_paid" });

    await admin
      .from("bookings")
      .update({
        stripe_payment_intent_id: intent.id,
        stripe_customer_id: customerId,
        site: getSite(request.headers.get("Origin")),
        allergies: allergies || null,
        allergies_consented_at: allergies ? new Date().toISOString() : null,
      })
      .eq("id", quote.id);

    return respond(200, { clientSecret: intent.client_secret });
  } catch (error) {
    console.error("booking-checkout failed", error instanceof Error ? error.message : error);

    return respond(500, { error: "unknown" });
  }
});
