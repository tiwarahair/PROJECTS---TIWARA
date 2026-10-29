// Declines no retry can fix: the card is gone or the bank has said never to try again.
const HARD_DECLINES = ["lost_card", "stolen_card", "pickup_card", "restricted_card", "do_not_try_again"];

export const isHardDecline = (code: string | null | undefined) => HARD_DECLINES.includes(code ?? "");

// the bank wants the client there to approve it, so only a payment link they open can take it
export const cannotRetry = (code: string | null | undefined) =>
  isHardDecline(code) || code === "authentication_required";

/** "Visa •••• 4242" */
export const getCardLabel = (brand: string | null | undefined, last4: string | null | undefined) =>
  brand && last4 ? `${brand.charAt(0).toUpperCase()}${brand.slice(1)} •••• ${last4}` : null;
