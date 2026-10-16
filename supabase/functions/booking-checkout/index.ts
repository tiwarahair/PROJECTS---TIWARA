// Pay for a held booking: checks the person (Turnstile) and the hold, saves the details, and returns a
// PaymentIntent for the Payment Element. Only Stripe's webhook confirms the booking.
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@4";
import { getPaymentParams, savesCard } from "../_shared/booking-payment.ts";
import type { CheckoutQuote } from "../_shared/booking-payment.ts";
import { getClientIp } from "../_shared/client-ip.ts";
import { corsHeaders, respond } from "../_shared/cors.ts";
import { stripe } from "../_shared/stripe.ts";
import { isHuman } from "../_shared/turnstile.ts";

const IP_LIMIT = 20;
const WINDOW_SECONDS = 600;

// checkout_booking's own errors, passed on for the page to explain
const CHECKOUT_ERRORS = ["hold_not_found", "already_paid", "address_required", "outside_area"];

// a PaymentIntent still waiting for the client can take new amounts and choices
const OPEN_STATUSES = ["requires_payment_method", "requires_confirmation", "requires_action"];

const text = (max: number) => z.string().trim().max(max);

const requestSchema = z.object({
  hold: z.object({ id: z.uuid(), secret: z.string().min(1).max(100) }),
  contact: z.object({
    first: text(60).min(1),
    last: text(60).min(1),
    email: z.email().max(254),
    phone: z
      .string()
      .refine((value) => /^7\d{9}$/.test(value.replace(/\D/g, "").replace(/^44/, "").replace(/^0/, ""))),
  }),
  notes: text(500),
  address: z
    .object({
      line1: text(120).min(1),
      line2: text(120),
      town: text(80),
      postcode: text(10).min(1),
      notes: text(300),
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
  keepCard: z.boolean(),
  turnstileToken: z.string().min(1).max(2048),
});

type Contact = z.infer<typeof requestSchema>["contact"];

interface Quote extends CheckoutQuote {
  customer_id: string | null;
  payment_intent_id: string | null;
}

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

/** The signed-in client, if the caller sent their session. */
const getClientId = async (request: Request) => {
  const token = request.headers.get("Authorization")?.replace(/^Bearer /, "");

  if (!token) return null;

  const { data } = await admin.auth.getUser(token);

  return data.user?.id ?? null;
};

/** A signed-in client's Customer is kept on their profile; a guest's on the booking. */
const getCustomerId = async (quote: Quote, contact: Contact, clientId: string | null) => {
  if (clientId) {
    const { data: profile } = await admin.from("profiles").select("stripe_customer_id").eq("id", clientId).single();

    if (profile?.stripe_customer_id) return profile.stripe_customer_id as string;
  } else if (quote.customer_id) return quote.customer_id;

  const customer = await stripe.customers.create(
    { email: contact.email, name: `${contact.first} ${contact.last}`, phone: contact.phone },
    { idempotencyKey: clientId ? `profile:${clientId}:customer` : `booking:${quote.id}:customer` },
  );

  if (clientId) await admin.from("profiles").update({ stripe_customer_id: customer.id }).eq("id", clientId);

  return customer.id;
};

const getPaymentIntent = async (quote: Quote, customerId: string | null, keepCard: boolean) => {
  const params = getPaymentParams(quote, customerId, keepCard);

  if (!quote.payment_intent_id)
    return stripe.paymentIntents.create(params, { idempotencyKey: `booking:${quote.id}:pi` });

  const existing = await stripe.paymentIntents.retrieve(quote.payment_intent_id);

  if (!OPEN_STATUSES.includes(existing.status)) return existing;

  const { amount, application_fee_amount, customer, setup_future_usage } = params;

  return stripe.paymentIntents.update(existing.id, {
    amount,
    ...(application_fee_amount ? { application_fee_amount } : {}),
    ...(customer ? { customer } : {}),
    setup_future_usage: setup_future_usage ?? "",
  });
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) return respond(400, { error: "invalid_request" });

  const ip = getClientIp(request);

  const { data: isWithinLimit, error: limitError } = await admin.rpc("hit_rate_limit", {
    limit_key: `booking-checkout:${ip}`,
    max_hits: IP_LIMIT,
    window_seconds: WINDOW_SECONDS,
  });

  if (limitError) return respond(500, { error: "unknown" });

  if (!isWithinLimit) return respond(429, { error: "rate_limited" });

  const { hold, contact, notes, address, keepCard, turnstileToken } = parsed.data;

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

  if (error && CHECKOUT_ERRORS.includes(error.message)) return respond(409, { error: error.message });

  if (error) {
    console.error("checkout_booking failed", error.code);

    return respond(500, { error: "unknown" });
  }

  const quote = data as Quote;
  const wantsCustomer = savesCard(quote.mode) || keepCard || !!clientId;

  try {
    const customerId = wantsCustomer ? await getCustomerId(quote, contact, clientId) : null;
    const intent = await getPaymentIntent(quote, customerId, keepCard && !!clientId);

    if (intent.status === "succeeded") return respond(409, { error: "already_paid" });

    await admin
      .from("bookings")
      .update({ stripe_payment_intent_id: intent.id, stripe_customer_id: customerId })
      .eq("id", quote.id);

    return respond(200, { clientSecret: intent.client_secret });
  } catch (stripeError) {
    console.error("stripe failed", stripeError instanceof Error ? stripeError.message : stripeError);

    return respond(502, { error: "unknown" });
  }
});
