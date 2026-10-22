// Refused while the client has a booking to come, owes money or owns a business; otherwise their bookings are
// anonymised (the money stays as records), the photo is deleted and the login goes, taking the profile and saved
// addresses with it.
import { admin } from "../_shared/admin.ts";
import { corsHeaders, respond } from "../_shared/cors.ts";
import { z } from "npm:zod@4";
import { getSignedInSession } from "../_shared/recent-user.ts";
import { stripe } from "../_shared/stripe.ts";

interface Blockers {
  bookings: unknown[];
  owes_money: boolean;
  has_business: boolean;
}

const isBlocked = ({ bookings, owes_money, has_business }: Blockers) =>
  bookings.length > 0 || owes_money || has_business;

const deleteCustomer = async (customerId: string) => {
  try {
    await stripe.customers.del(customerId);
  } catch (error) {
    // already gone at Stripe: nothing left to delete
    if ((error as { code?: string }).code !== "resource_missing") throw error;
  }
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const signedIn = await getSignedInSession(admin, request);

  if (!signedIn) return respond(401, { error: "signed_out" });

  const parsed = z
    .object({ code: z.string().regex(/^\d{6}$/).optional() })
    .safeParse(await request.json().catch(() => ({})));

  if (!parsed.success) return respond(400, { error: "invalid_request" });

  const { user: client, sessionId } = signedIn;

  const { data: blockers, error } = await admin.rpc("get_deletion_blockers", { client });

  if (error) return respond(500, { error: "unknown" });

  if (isBlocked(blockers as Blockers)) return respond(409, { error: "blocked" });

  // a session over a day old proves it's them with an emailed code first
  const { data: isRecent } = await admin.rpc("is_recent_session", { session: sessionId });

  if (!isRecent) {
    const { code } = parsed.data;

    if (!code) return respond(403, { error: "code_needed" });

    const { data: check } = await admin.rpc("use_account_code", { client, code });

    if (check !== "verified") return respond(400, { error: check ?? "unknown" });
  }

  try {
    const { data: profile } = await admin.from("profiles").select("stripe_customer_id").eq("id", client).single();

    if (profile?.stripe_customer_id) {
      await deleteCustomer(profile.stripe_customer_id);
      // if a later step fails, checkout mustn't use the deleted customer
      await admin.from("profiles").update({ stripe_customer_id: null }).eq("id", client);
    }

    const { error: photoError } = await admin.storage.from("account-photos").remove([`${client}/photo.jpg`]);

    if (photoError) throw photoError;

    await admin.from("profiles").update({ photo_path: null }).eq("id", client);

    const { error: anonymiseError } = await admin.rpc("anonymise_client_bookings", { client });

    if (anonymiseError) throw anonymiseError;

    const { error: deleteError } = await admin.auth.admin.deleteUser(client);

    if (deleteError) throw deleteError;

    return respond(200, { deleted: true });
  } catch (deleteError) {
    console.error("client-delete-account failed", deleteError instanceof Error ? deleteError.message : deleteError);

    return respond(500, { error: "unknown" });
  }
});
