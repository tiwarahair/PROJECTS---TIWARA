// Earnings' balance card: what's available and pending in the stylist's Stripe balance, and the next payout's arrival.
import { admin } from "../_shared/admin.ts";
import { corsHeaders, respond } from "../_shared/cors.ts";
import { getStudioUser } from "../_shared/recent-user.ts";
import { stripe } from "../_shared/stripe.ts";

const getPence = (amounts: { amount: number; currency: string }[]) => {
  let total = 0;

  for (const { amount, currency } of amounts) if (currency === "gbp") total += amount;

  return total;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const owner = await getStudioUser(admin, request);

  if (!owner) return respond(401, { error: "signed_out" });

  const { data: stylist, error } = await admin
    .from("stylists")
    .select("stripe_account_id")
    .eq("owner_id", owner)
    .maybeSingle();

  if (error) return respond(500, { error: "unknown" });

  if (!stylist?.stripe_account_id) return respond(200, { available_pence: 0, pending_pence: 0, next_payout: null });

  try {
    const account = { stripeAccount: stylist.stripe_account_id };

    const [balance, upcoming] = await Promise.all([
      stripe.balance.retrieve({}, account),
      stripe.payouts.list({ limit: 10 }, account),
    ]);

    const next = upcoming.data
      .filter(({ status }) => status === "pending" || status === "in_transit")
      .sort((first, second) => first.arrival_date - second.arrival_date)[0];

    return respond(200, {
      available_pence: getPence(balance.available),
      pending_pence: getPence(balance.pending),
      next_payout: next ? new Date(next.arrival_date * 1000).toISOString() : null,
    });
  } catch (stripeError) {
    console.error("studio-balance failed", stripeError instanceof Error ? stripeError.message : stripeError);

    return respond(500, { error: "unknown" });
  }
});
