// Studio's checkout: prices it on the server, charges the saved card or refunds an overpayment, then completes it.
import { z } from "zod";
import { admin } from "../_shared/admin.ts";
import { corsHeaders, respond } from "../_shared/cors.ts";
import { getStudioUser } from "../_shared/recent-user.ts";
import { giveBackUnsavedCharge, settleUnsavedCharge } from "../_shared/unsaved-charge.ts";
import { chargeSavedCard, getGivenBack, getUnsavedCharges, isSameCharge, refundOverpaid } from "./charge.ts";
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

  const owner = await getStudioUser(admin, request);

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
    const unsaved = await getUnsavedCharges(quote);

    // the card went through on a try that wasn't saved: the same checkout finishes with it, anything else gives it back
    const reused =
      method === "card"
        ? (unsaved.find(({ intent, state }) => state === "charged" && isSameCharge(intent, quote))?.intent ?? null)
        : null;

    for (const { intent, state } of unsaved) {
      if (intent.id === reused?.id) continue;

      if (state === "charged")
        await giveBackUnsavedCharge(bookingId, intent.id, !!intent.transfer_data, quote.refund_failures);

      if (state === "settled") await settleUnsavedCharge(bookingId, intent.id, "not_charged");
    }

    const saveIntent = async (intentId: string) => {
      const { error: saveError } = await admin.rpc("add_checkout_intent", { target: bookingId, intent: intentId });

      if (saveError) throw saveError;
    };

    const charge = method === "card" ? await chargeSavedCard(quote, reused, saveIntent) : null;

    if (charge && !charge.paid) {
      const { error: declineError } = await admin.rpc("note_checkout_declined", {
        target: bookingId,
        intent: charge.payment_intent_id,
      });

      if (declineError) throw declineError;

      return respond(200, { outcome: "declined", hard: charge.hard, message: charge.message });
    }

    const refund = await refundOverpaid(quote);
    const givenBack = getGivenBack(quote, refund.refund_pence);

    const { data: finished, error: finishError } = await admin.rpc("finish_checkout", {
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
        ...givenBack,
      },
    });

    if (finishError) throw finishError;

    if (finished === "duplicate" && charge?.paid) {
      await giveBackUnsavedCharge(bookingId, charge.payment_intent_id, !charge.transfer_pending, quote.refund_failures);

      return respond(409, { error: "already_completed" });
    }

    return respond(200, { outcome: "completed", refunded_pence: refund.refund_pence, ...givenBack });
  } catch (error) {
    console.error("studio-checkout failed", error instanceof Error ? error.message : error);

    return respond(500, { error: "unknown" });
  }
});
