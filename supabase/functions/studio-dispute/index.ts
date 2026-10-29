import { z } from "zod";
import { admin } from "../_shared/admin.ts";
import { corsHeaders, respond } from "../_shared/cors.ts";
import { getDisputeFacts, isAnswerable, submitDispute } from "../_shared/dispute-evidence.ts";
import { getStudioUser } from "../_shared/recent-user.ts";
import { stripe } from "../_shared/stripe.ts";

// Stripe's advice for evidence files: PDF, JPEG or PNG, small enough to send together
const FILE_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;
const MAX_FILE_BYTES = 4_500_000;

const requestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("upload"),
    disputeId: z.uuid(),
    name: z.string().min(1).max(120),
    type: z.enum(FILE_TYPES),
    data: z.string().min(1),
  }),
  z.object({
    action: z.literal("submit"),
    disputeId: z.uuid(),
    text: z.string().trim().max(5000),
    photos: z.string().max(100).optional(),
    messages: z.string().max(100).optional(),
    other: z.string().max(100).optional(),
  }),
  z.object({ action: z.literal("accept"), disputeId: z.uuid() }),
]);

const toBytes = (base64: string) => Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const owner = await getStudioUser(admin, request);

  if (!owner) return respond(401, { error: "signed_out" });

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) return respond(400, { error: "invalid_request" });

  const body = parsed.data;

  try {
    const facts = await getDisputeFacts(body.disputeId, owner);

    if (!facts) return respond(404, { error: "not_found" });

    if (!isAnswerable(facts)) return respond(409, { error: "already_answered" });

    if (body.action === "upload") {
      const data = toBytes(body.data);

      if (data.byteLength > MAX_FILE_BYTES) return respond(413, { error: "file_too_large" });

      const file = await stripe.files.create({
        purpose: "dispute_evidence",
        file: { data, name: body.name, type: body.type },
      });

      return respond(200, { fileId: file.id });
    }

    if (body.action === "accept") {
      await stripe.disputes.close(facts.stripe_dispute_id);

      const { error } = await admin.rpc("save_dispute_response", {
        target: body.disputeId,
        response: "accepted",
        given: null,
      });

      if (error) throw error;

      return respond(200, { outcome: "accepted" });
    }

    const { text, photos, messages, other } = body;

    await submitDispute(body.disputeId, facts, { text, photos, messages, other });

    return respond(200, { outcome: "submitted" });
  } catch (error) {
    console.error("studio-dispute failed", error instanceof Error ? error.message : error);

    return respond(500, { error: "unknown" });
  }
});
