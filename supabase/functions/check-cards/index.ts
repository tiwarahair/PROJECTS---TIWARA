// Run by cron: a card kept for fees that expires before the appointment gets the client asked for a new one, and a
// new card the client added is recorded if the update-card page missed it.
import { admin } from "../_shared/admin.ts";
import { saveCardUpdate } from "../_shared/card-update.ts";
import { stripe } from "../_shared/stripe.ts";
import { expiresBefore } from "./expiry.ts";

const BATCH_SIZE = 20;

interface CardCheck {
  booking_id: string;
  payment_method_id: string;
  starts_at: string;
}

// a card that's gone (removed or detached) is as good as expired
const isExpiring = async ({ payment_method_id: paymentMethodId, starts_at: startsAt }: CardCheck) => {
  try {
    const { card } = await stripe.paymentMethods.retrieve(paymentMethodId);

    return !card || expiresBefore(card.exp_month, card.exp_year, startsAt);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "resource_missing") return true;

    throw error;
  }
};

interface UnsavedUpdate {
  booking_id: string;
  setup_intent_id: string;
}

// a new card the client added that the update-card page couldn't record, before the booking is marked failed
const finishUnsavedUpdates = async () => {
  const { data, error } = await admin.rpc("get_unsaved_card_updates", { batch_size: BATCH_SIZE });

  if (error) throw error;

  for (const { booking_id: bookingId, setup_intent_id: intentId } of (data ?? []) as UnsavedUpdate[]) {
    const isSaved = await saveCardUpdate(bookingId, intentId).catch((saveError) => {
      console.error("check-cards save failed", bookingId, saveError instanceof Error ? saveError.message : saveError);

      return false;
    });

    // one the client left unfinished waits before it's looked at again
    if (!isSaved) await admin.rpc("note_card_setup_checked", { target: bookingId });
  }
};

Deno.serve(async (request) => {
  const secret = Deno.env.get("CRON_SECRET");

  if (!secret || request.headers.get("x-cron-secret") !== secret) return new Response("Forbidden", { status: 403 });

  try {
    await finishUnsavedUpdates();
  } catch (unsavedError) {
    console.error(
      "check-cards unsaved updates failed",
      unsavedError instanceof Error ? unsavedError.message : unsavedError,
    );
  }

  const { data, error } = await admin.rpc("claim_card_checks", { batch_size: BATCH_SIZE });

  if (error) return new Response(error.message, { status: 500 });

  const checks = (data ?? []) as CardCheck[];
  let failed = 0;

  for (const check of checks) {
    try {
      const { error: saveError } = await admin.rpc("save_card_check", {
        target: check.booking_id,
        is_expiring: await isExpiring(check),
      });

      if (saveError) throw saveError;
    } catch (checkError) {
      failed++;
      console.error(
        "check-cards failed",
        check.booking_id,
        checkError instanceof Error ? checkError.message : checkError,
      );
    }
  }

  return Response.json({ checked: checks.length - failed, failed });
});
