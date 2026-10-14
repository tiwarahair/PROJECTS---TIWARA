// Stripe's Connect events (Accounts v2 "thin" events): verifies the signature, handles each event once, and
// re-reads the account so stylists' payout status stays current whatever order events arrive in.
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@22.6.2";
import { stripe, syncAccount } from "../_shared/stripe.ts";

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

  const { data: seen } = await admin.from("stripe_events").select("id").eq("id", notification.id).maybeSingle();

  if (seen) return Response.json({ received: true, duplicate: true });

  const accountId = notification.related_object?.id;

  if (notification.type.startsWith("v2.core.account") && accountId?.startsWith("acct_")) {
    try {
      // the business may not have its account id yet: it's saved just after the account is made
      if (!(await syncAccount(admin, accountId))) throw new Error(`no business has ${accountId}`);
    } catch (error) {
      // not recorded, so Stripe's retry is handled
      return new Response(error instanceof Error ? error.message : "failed", { status: 500 });
    }
  }

  // a duplicate delivered at the same moment is harmless: the account was re-read either way
  await admin.from("stripe_events").insert({ id: notification.id, type: notification.type });

  return Response.json({ received: true });
});
