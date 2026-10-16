import { z } from "npm:zod@4";
import { admin } from "../_shared/admin.ts";
import { getClientIp } from "../_shared/client-ip.ts";
import { corsHeaders, respond } from "../_shared/cors.ts";
import { isWithinLimit } from "../_shared/rate-limit.ts";

const CLIENT_MIN_PASSWORD = 15;

const token = z.string().min(1).max(100);

const requestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("view"), token }),
  z.object({ action: z.literal("renew"), token }),
  z.object({
    action: z.literal("claim"),
    token,
    password: z.string().min(CLIENT_MIN_PASSWORD).max(256),
    termsVersion: z.string().min(1).max(20),
  }),
]);

interface Invite {
  state: "valid" | "expired" | "account_exists";
  first: string;
  last: string;
  email: string;
  phone: string;
}

const getInvite = async (inviteToken: string) => {
  const { data, error } = await admin.rpc("get_booking_invite", { token: inviteToken });

  if (error?.message === "link_not_valid") return null;

  if (error) throw error;

  return data as Invite;
};

const claim = async (inviteToken: string, invite: Invite, password: string, termsVersion: string) => {
  const { first, last, email, phone } = invite;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      account_type: "client",
      first_name: first,
      last_name: last,
      phone,
      marketing: false,
      terms_version: termsVersion,
    },
  });

  if (error?.code === "email_exists") return respond(409, { error: "account_exists" });

  if (error) throw error;

  const { error: claimError } = await admin.rpc("claim_booking_invite", { token: inviteToken, user_id: data.user.id });

  if (claimError) {
    await admin.auth.admin.deleteUser(data.user.id);

    throw claimError;
  }

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email });

  if (linkError) throw linkError;

  return respond(200, { tokenHash: link.properties.hashed_token });
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) return respond(400, { error: "invalid_request" });

  const { data: body } = parsed;

  try {
    if (!(await isWithinLimit(`booking-invite:${body.action}:${getClientIp(request)}`, 20, 600)))
      return respond(429, { error: "rate_limited" });

    const invite = await getInvite(body.token);

    if (!invite) return respond(404, { error: "link_not_valid" });

    const { state, first, last, email } = invite;

    if (body.action === "view") return respond(200, { state, first, last, email });

    if (body.action === "renew") {
      if (state !== "expired") return respond(409, { error: state });

      const { error } = await admin.rpc("renew_booking_invite", { token: body.token });

      if (error) throw error;

      return respond(200, { email });
    }

    if (state !== "valid") return respond(409, { error: state });

    return await claim(body.token, invite, body.password, body.termsVersion);
  } catch (error) {
    console.error("booking-invite failed", error instanceof Error ? error.message : error);

    return respond(500, { error: "unknown" });
  }
});
