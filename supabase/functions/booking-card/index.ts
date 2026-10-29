// The client's update-card page: "view" shows the booking (finishing a card Stripe saved but we didn't record yet), "start" sets up a new card with Stripe (Turnstile-checked), "save" makes it the booking's card for fees
import { z } from "zod";
import { admin } from "../_shared/admin.ts";
import { saveCardUpdate } from "../_shared/card-update.ts";
import { getClientIp } from "../_shared/client-ip.ts";
import { corsHeaders, respond } from "../_shared/cors.ts";
import { isWithinLimit } from "../_shared/rate-limit.ts";
import { stripe } from "../_shared/stripe.ts";
import { isHuman } from "../_shared/turnstile.ts";

const OPEN_STATUSES = ["requires_payment_method", "requires_confirmation", "requires_action"];

const STATE_ERRORS: Record<string, string> = {
  updated: "card_updated",
  expired: "link_expired",
  unavailable: "booking_unavailable",
};

const tokenSchema = z.string().min(1).max(100);

const requestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("view"), token: tokenSchema }),
  z.object({
    action: z.literal("start"),
    token: tokenSchema,
    turnstileToken: z.string().min(1).max(2048),
  }),
  z.object({ action: z.literal("save"), token: tokenSchema }),
]);

interface CardUpdate {
  booking_id: string;
  state: "open" | "updated" | "expired" | "unavailable";
  customer_id: string | null;
  setup_intent_id: string | null;
  [shown: string]: unknown;
}

const getUpdate = async (token: string) => {
  const { data, error } = await admin.rpc("get_card_update", { token });

  if (error) throw error;

  return data as CardUpdate | null;
};

// what the page shows: none of our ids, nor what the stylist noted about the client
const toPage = (
  {
    booking_id: _bookingId,
    customer_id: _customerId,
    setup_intent_id: _intentId,
    client_phone: _phone,
    notes: _notes,
    address_notes: _addressNotes,
    ...shown
  }: CardUpdate,
  state = shown.state,
) => ({ ...shown, state });

const startSetup = async (update: CardUpdate) => {
  const earlier = update.setup_intent_id ? await stripe.setupIntents.retrieve(update.setup_intent_id) : null;

  const intent =
    earlier && OPEN_STATUSES.includes(earlier.status)
      ? earlier
      : await stripe.setupIntents.create({
          customer: update.customer_id as string,
          usage: "off_session",
          payment_method_types: ["card"],
          metadata: { booking_id: update.booking_id, kind: "card_update" },
        });

  const { error } = await admin.rpc("set_card_setup_intent", {
    target: update.booking_id,
    intent: intent.id,
  });

  if (error) throw error;

  return intent.client_secret;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) return respond(400, { error: "invalid_request" });

  const clientIp = getClientIp(request);
  const { action, token } = parsed.data;

  try {
    if (!(await isWithinLimit(`booking-card:${clientIp}`, 30, 600))) return respond(429, { error: "rate_limited" });

    if (action === "start" && !(await isHuman(parsed.data.turnstileToken, clientIp)))
      return respond(403, { error: "turnstile_failed" });

    const update = await getUpdate(token);

    if (!update) return respond(404, { error: "link_not_valid" });

    if (update.state === "open" && (await saveCardUpdate(update.booking_id, update.setup_intent_id)))
      return action === "start" ? respond(409, { error: "card_updated" }) : respond(200, toPage(update, "updated"));

    if (action === "view") return respond(200, toPage(update));

    // Stripe hasn't confirmed a card for this booking (yet)
    if (action === "save")
      return update.state === "open" ? respond(409, { error: "card_not_saved" }) : respond(200, toPage(update));

    if (update.state !== "open") return respond(409, { error: STATE_ERRORS[update.state] });

    if (!update.customer_id) return respond(409, { error: "booking_unavailable" });

    return respond(200, { clientSecret: await startSetup(update) });
  } catch (error) {
    console.error("booking-card failed", error instanceof Error ? error.message : error);

    return respond(500, { error: "unknown" });
  }
});
