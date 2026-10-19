// The public pay page for a fee: "view" shows what's owed, "pay" starts the card payment (Turnstile-checked).
import { z } from "npm:zod@4";
import { admin } from "../_shared/admin.ts";
import { getClientIp } from "../_shared/client-ip.ts";
import { corsHeaders, respond } from "../_shared/cors.ts";
import { isWithinLimit } from "../_shared/rate-limit.ts";
import { stripe } from "../_shared/stripe.ts";
import { isHuman } from "../_shared/turnstile.ts";

const LINK_ERRORS = ["link_not_valid", "link_paid", "link_expired"];
const OPEN_STATUSES = ["requires_payment_method", "requires_confirmation", "requires_action"];

const requestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("view"), token: z.string().min(1).max(100) }),
  z.object({ action: z.literal("pay"), token: z.string().min(1).max(100), turnstileToken: z.string().min(1) }),
]);

interface LinkPayment {
  link_id: string;
  booking_id: string;
  booking_ref: string;
  amount_pence: number;
  customer_id: string | null;
  payment_intent_id: string | null;
  stylist_account: string | null;
  stylist_can_receive: boolean;
}

const getIntent = async (link: LinkPayment) => {
  if (link.payment_intent_id) {
    const existing = await stripe.paymentIntents.retrieve(link.payment_intent_id);

    if (OPEN_STATUSES.includes(existing.status)) return existing;
  }

  const canTransfer = !!link.stylist_account && link.stylist_can_receive;

  return stripe.paymentIntents.create(
    {
      amount: link.amount_pence,
      currency: "gbp",
      allowed_payment_method_types: ["card"],
      description: `${link.booking_ref}: fee`,
      ...(link.customer_id ? { customer: link.customer_id } : {}),
      metadata: {
        kind: "link",
        link_id: link.link_id,
        booking_id: link.booking_id,
        transfer_pending: String(!canTransfer),
      },
      ...(canTransfer ? { transfer_data: { destination: link.stylist_account as string } } : {}),
    },
    // a new key after each replaced payment, so Stripe doesn't hand back the old one
    { idempotencyKey: `link:${link.link_id}:after:${link.payment_intent_id ?? "none"}` },
  );
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) return respond(400, { error: "invalid_request" });

  const clientIp = getClientIp(request);

  try {
    if (!(await isWithinLimit(`payment-link:${clientIp}`, 30, 600))) return respond(429, { error: "rate_limited" });

    if (parsed.data.action === "view") {
      const { data, error } = await admin.rpc("get_payment_link", { token: parsed.data.token });

      if (error) throw error;

      return data ? respond(200, data) : respond(404, { error: "link_not_valid" });
    }

    if (!(await isHuman(parsed.data.turnstileToken, clientIp))) return respond(403, { error: "turnstile_failed" });

    const { data, error } = await admin.rpc("start_link_payment", { token: parsed.data.token });

    if (error && LINK_ERRORS.includes(error.message)) return respond(409, { error: error.message });

    if (error) throw error;

    const link = data as LinkPayment;
    const intent = await getIntent(link);

    if (intent.status === "succeeded") return respond(409, { error: "link_paid" });

    const { error: saveError } = await admin.rpc("set_link_intent", { link: link.link_id, intent: intent.id });

    if (saveError) throw saveError;

    return respond(200, { clientSecret: intent.client_secret });
  } catch (error) {
    console.error("payment-link failed", error instanceof Error ? error.message : error);

    return respond(500, { error: "unknown" });
  }
});
