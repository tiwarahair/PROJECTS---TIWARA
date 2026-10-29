import { admin } from "./admin.ts";

/** True when this delivery is the one to handle the event: not handled already, nor being handled right now. */
export const claimEvent = async (eventId: string, type: string) => {
  const { data, error } = await admin.rpc("claim_stripe_event", { event_id: eventId, event_type: type });

  if (error) throw error;

  return !!data;
};

/** Handled, or given up so Stripe's next delivery tries again. */
export const finishEvent = async (eventId: string, isHandled: boolean) => {
  const { error } = await admin.rpc("finish_stripe_event", { event_id: eventId, is_handled: isHandled });

  if (error) console.error("finish_stripe_event failed", eventId, error.message);
};
