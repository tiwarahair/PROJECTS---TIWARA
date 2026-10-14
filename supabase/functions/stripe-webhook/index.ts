// Stripe's Connect events (Accounts v2 "thin" events): verifies the signature, handles each event once, and
// re-reads the account so stylists' payout status stays current whatever order events arrive in.
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@22.6.2";
import { stripe, syncAccount } from "../_shared/stripe.ts";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const cryptoProvider = Stripe.createSubtleCryptoProvider();

const hasBusiness = async (stylistId: string) => {
  const { data, error } = await admin.from("stylists").select("id").eq("id", stylistId).maybeSingle();

  if (error) throw error;

  return !!data;
};

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
      const { saved, stylistId } = await syncAccount(admin, accountId);

      // its business is here but hasn't saved the account id yet (that happens just after the account is made);
      // otherwise the account is from another environment sharing this Stripe sandbox, so there's nothing to do
      if (!saved && stylistId && (await hasBusiness(stylistId))) throw new Error(`${accountId} isn't saved yet`);
    } catch (error) {
      // not recorded, so Stripe's retry is handled
      return new Response(error instanceof Error ? error.message : "failed", { status: 500 });
    }
  }

  // a duplicate delivered at the same moment is harmless: the account was re-read either way
  await admin.from("stripe_events").insert({ id: notification.id, type: notification.type });

  return Response.json({ received: true });
});
