// Account → Payment methods: the signed-in client's saved cards on their own Stripe customer (card numbers never reach us)
import { z } from "npm:zod@4";
import { admin } from "../_shared/admin.ts";
import { corsHeaders, respond } from "../_shared/cors.ts";
import { getSignedInUser } from "../_shared/recent-user.ts";
import { stripe } from "../_shared/stripe.ts";
import { toCardRows } from "./cards.ts";

const requestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("list") }),
  z.object({ action: z.literal("setup") }),
  z.object({
    action: z.literal("remove"),
    card: z.string().startsWith("pm_").max(255),
  }),
  z.object({
    action: z.literal("default"),
    card: z.string().startsWith("pm_").max(255),
  }),
]);

const UPCOMING = ["awaiting_confirmation", "confirmed", "arrived"];

const getSavedCustomerId = async (client: string) => {
  const { data } = await admin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", client)
    .single();

  return (data?.stripe_customer_id as string | null) ?? null;
};

// checkout uses the same idempotency key, so a race between the two can't make a second customer
const createCustomer = async (client: string) => {
  const [{ data: profile }, { data: user }] = await Promise.all([
    admin
      .from("profiles")
      .select("first_name, last_name, phone")
      .eq("id", client)
      .single(),
    admin.auth.admin.getUserById(client),
  ]);

  const customer = await stripe.customers.create(
    {
      email: user.user?.email,
      name:
        [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
        undefined,
      phone: profile?.phone ?? undefined,
    },
    { idempotencyKey: `profile:${client}:customer` },
  );

  await admin
    .from("profiles")
    .update({ stripe_customer_id: customer.id })
    .eq("id", client);

  return customer.id;
};

const listCards = async (customerId: string | null) => {
  if (!customerId) return [];

  const [customer, methods] = await Promise.all([
    stripe.customers.retrieve(customerId),
    stripe.customers.listPaymentMethods(customerId, {
      type: "card",
      limit: 20,
    }),
  ]);

  const defaultMethod = customer.deleted
    ? null
    : customer.invoice_settings.default_payment_method;

  return toCardRows(
    methods.data,
    typeof defaultMethod === "string"
      ? defaultMethod
      : (defaultMethod?.id ?? null),
  );
};

const getOwnCard = async (customerId: string | null, card: string) => {
  if (!customerId) return null;

  const method = await stripe.paymentMethods.retrieve(card).catch(() => null);

  return method?.customer === customerId ? method : null;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  const client = await getSignedInUser(admin, request);

  if (!client) return respond(401, { error: "signed_out" });

  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsed.success) return respond(400, { error: "invalid_request" });

  const body = parsed.data;

  try {
    const customerId = await getSavedCustomerId(client);

    if (body.action === "list")
      return respond(200, { cards: await listCards(customerId) });

    if (body.action === "setup") {
      const intent = await stripe.setupIntents.create({
        customer: customerId ?? (await createCustomer(client)),
        payment_method_types: ["card"],
        usage: "off_session",
      });

      return respond(200, { clientSecret: intent.client_secret });
    }

    if (!(await getOwnCard(customerId, body.card)))
      return respond(404, { error: "card_not_found" });

    if (body.action === "default") {
      await stripe.customers.update(customerId!, {
        invoice_settings: { default_payment_method: body.card },
      });

      return respond(200, { cards: await listCards(customerId) });
    }

    // a card that secures an upcoming booking stays until the booking is over
    const { count } = await admin
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("client_id", client)
      .eq("stripe_payment_method_id", body.card)
      .in("status", UPCOMING);

    if (count) return respond(409, { error: "card_in_use" });

    await stripe.paymentMethods.detach(body.card);

    return respond(200, { cards: await listCards(customerId) });
  } catch (stripeError) {
    console.error(
      "client-cards failed",
      stripeError instanceof Error ? stripeError.message : stripeError,
    );

    return respond(500, { error: "unknown" });
  }
});
