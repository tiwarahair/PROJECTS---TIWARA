// Stripe's Connect events (Accounts v2 "thin" events): verifies the signature, handles each event once, and
// re-reads the account so stylists' payout status stays current whatever order events arrive in.
import Stripe from "npm:stripe@22.6.2";
import { admin } from "../_shared/admin.ts";
import { stripe, syncAccount } from "../_shared/stripe.ts";
import { isHandled, markHandled } from "../_shared/stripe-events.ts";

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

  if (await isHandled(notification.id)) return Response.json({ received: true, duplicate: true });

  const accountId = "related_object" in notification ? notification.related_object?.id : undefined;

  if (notification.type.startsWith("v2.core.account") && accountId?.startsWith("acct_")) {
    try {
      const { saved, stylistId } = await syncAccount(admin, accountId);

      // an unknown business means the account is from another environment sharing this Stripe sandbox
      if (!saved && stylistId && (await hasBusiness(stylistId))) throw new Error(`${accountId} isn't saved yet`);
    } catch (error) {
      return new Response(error instanceof Error ? error.message : "failed", { status: 500 });
    }
  }

  await markHandled(notification.id, notification.type);

  return Response.json({ received: true });
});
