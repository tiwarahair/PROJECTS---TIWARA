// Stripe's Connect events (Accounts v2 "thin" events): verifies the signature, handles each event once, and
// re-reads the account so stylists' payout status stays current whatever order events arrive in.
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@22.6.2";
import { getAccountState, retrieveAccount, stripe } from "../_shared/stripe.ts";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const cryptoProvider = Stripe.createSubtleCryptoProvider();

Deno.serve(async (request) => {
  let notification: Awaited<ReturnType<typeof stripe.parseEventNotificationAsync>>;

  try {
    notification = await stripe.parseEventNotificationAsync(
      await request.text(),
      request.headers.get("Stripe-Signature") ?? "",
      Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "",
      undefined,
      cryptoProvider,
    );
  } catch {
    return new Response("Bad signature", { status: 400 });
  }

  const { error: seenError } = await admin
    .from("stripe_events")
    .insert({ id: notification.id, type: notification.type });

  if (seenError?.code === "23505") return Response.json({ received: true, duplicate: true });

  if (seenError) return new Response(seenError.message, { status: 500 });

  const accountId = notification.related_object?.id;

  if (notification.type.startsWith("v2.core.account") && accountId?.startsWith("acct_")) {
    try {
      const state = await getAccountState(await retrieveAccount(accountId));
      const { error } = await admin.from("stylists").update(state).eq("stripe_account_id", accountId);

      if (error) throw error;
    } catch (error) {
      // forget the event so Stripe's retry isn't skipped
      await admin.from("stripe_events").delete().eq("id", notification.id);

      return new Response(error instanceof Error ? error.message : "failed", { status: 500 });
    }
  }

  return Response.json({ received: true });
});
