// Studio's checkout: prices it on the server, charges the saved card or refunds an overpayment, then completes it.
import { z } from "npm:zod@4";
import { admin } from "../_shared/admin.ts";
import { corsHeaders, respond } from "../_shared/cors.ts";
import { getSignedInUser } from "../_shared/recent-user.ts";
import { chargeSavedCard, refundOverpaid } from "./charge.ts";
import type { CheckoutQuote } from "./charge.ts";

const REFUSALS = [
  "not_found",
  "already_completed",
  "checkout_not_allowed",
  "invalid_lines",
  "reason_required",
  "method_not_allowed",
  "card_over_agreed",
  "tip_too_high",
  "tip_not_allowed",
  "no_contact_email",
  "checkout_in_progress",
];

const lineSchema = z.object({
  name: z.string().trim().min(1).max(120),
  subtitle: z.string().max(200),
  base_pence: z.number().int().min(0),
  adjustment_pence: z.number().int(),
  reason: z.string().max(200),
});

const requestSchema = z.object({
  bookingId: z.uuid(),
  lines: z.array(lineSchema).min(1).max(30),
  tipPence: z.number().int().min(0),
  method: z.enum(["none", "card", "link", "record"]),
  via: z.string().max(20),
});

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const owner = await getSignedInUser(admin, request);

  if (!owner) return respond(401, { error: "signed_out" });

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) return respond(400, { error: "invalid_request" });

  const { bookingId, lines, tipPence, method, via } = parsed.data;

  try {
    const { data, error } = await admin.rpc("claim_checkout", {
      target: bookingId,
      owner,
      input: { lines, tip_pence: tipPence, method, via },
    });

    if (error && REFUSALS.includes(error.message)) return respond(409, { error: error.message });

    if (error) throw error;

    const quote = data as CheckoutQuote;
    const charge = method === "card" ? await chargeSavedCard(quote) : null;

    if (charge && !charge.paid) {
      const { error: declineError } = await admin.rpc("note_checkout_declined", { target: bookingId });

      if (declineError) throw declineError;

      return respond(200, { outcome: "declined", hard: charge.hard, message: charge.message });
    }

    const refund = await refundOverpaid(quote);

    const { error: finishError } = await admin.rpc("finish_checkout", {
      target: bookingId,
      result: {
        method,
        via,
        lines,
        final_pence: quote.final_pence,
        tip_pence: method === "link" ? 0 : quote.tip_pence,
        charge_pence: quote.charge_pence,
        // a charge found from an earlier try keeps its own amount
        ...charge,
        ...refund,
      },
    });

    if (finishError) throw finishError;

    return respond(200, { outcome: "completed" });
  } catch (error) {
    console.error("studio-checkout failed", error instanceof Error ? error.message : error);

    return respond(500, { error: "unknown" });
  }
});
