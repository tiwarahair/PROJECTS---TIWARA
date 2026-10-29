import { admin } from "../_shared/admin.ts";
import { corsHeaders, respond } from "../_shared/cors.ts";
import { getSignedInUser } from "../_shared/recent-user.ts";
import { getRecoveryMetadata } from "../_shared/recovery-metadata.ts";
import { getSite } from "../_shared/site.ts";
import { stripe } from "../_shared/stripe.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const owner = await getSignedInUser(admin, request);

  if (!owner) return respond(401, { error: "signed_out" });

  try {
    const [{ data: stylist, error }, { data: user }] = await Promise.all([
      admin.from("stylists").select("id, business_name, stripe_account_id").eq("owner_id", owner).maybeSingle(),
      admin.auth.admin.getUserById(owner),
    ]);

    if (error) throw error;

    if (!stylist?.stripe_account_id) return respond(409, { error: "nothing_owed" });

    const { id, business_name: business, stripe_account_id: account } = stylist;
    const { data: owed, error: owedError } = await admin.rpc("get_owed_pence", {
      account,
    });

    if (owedError) throw owedError;

    if (!owed) return respond(409, { error: "nothing_owed" });

    const site = getSite(request.headers.get("Origin"));

    // paid like any other recovery: the webhook takes it off the debts and sends back anything paid twice
    const { url } = await stripe.checkout.sessions.create({
      mode: "payment",
      // Stripe's merchant-of-record mode adds sales tax and is for digital goods, not a fee owed to us
      managed_payments: { enabled: false },
      payment_method_types: ["card"],
      customer_email: user.user?.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "gbp",
            unit_amount: owed,
            product_data: { name: "Fees owed to Tiwara’s House" },
          },
        },
      ],
      payment_intent_data: {
        description: `Fees owed to Tiwara’s House by ${business}`,
        metadata: {
          kind: "debt",
          stylist_id: id,
          ...getRecoveryMetadata(account, owed),
        },
      },
      success_url: `${site}/studio?owed=paid`,
      cancel_url: `${site}/studio?owed=cancelled`,
    });

    return respond(200, { url });
  } catch (error) {
    console.error("studio-debt failed", error instanceof Error ? error.message : error);

    return respond(500, { error: "unknown" });
  }
});
