// Studio's "Retry card" for a fee the card declined: charges it now and says how it went.
import { z } from "zod";
import { admin } from "../_shared/admin.ts";
import { corsHeaders, respond } from "../_shared/cors.ts";
import { settleFee } from "../_shared/fee-settlement.ts";
import type { FeeSettlement } from "../_shared/fee-settlement.ts";
import { getStudioUser } from "../_shared/recent-user.ts";

const ERRORS: Record<string, number> = { not_found: 404, retry_not_allowed: 409 };

const requestSchema = z.object({ bookingId: z.uuid() });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const owner = await getStudioUser(admin, request);

  if (!owner) return respond(401, { error: "signed_out" });

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) return respond(400, { error: "invalid_request" });

  try {
    const { data, error } = await admin.rpc("claim_fee_retry", {
      target_booking: parsed.data.bookingId,
      owner,
    });

    if (error && ERRORS[error.message]) return respond(ERRORS[error.message], { error: error.message });

    if (error) throw error;

    const { outcome, decline_message: declineMessage } = await settleFee(data as FeeSettlement);

    return respond(200, { outcome, declineMessage: declineMessage ?? null });
  } catch (error) {
    console.error("studio-fee failed", error instanceof Error ? error.message : error);

    return respond(500, { error: "unknown" });
  }
});
