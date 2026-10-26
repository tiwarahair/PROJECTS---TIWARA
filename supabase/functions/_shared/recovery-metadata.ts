/** Added to the charge's metadata, so the webhook knows what this payment recovered and from whom. */
export const getRecoveryMetadata = (account: string | null, recovered: number): Record<string, string> =>
  recovered > 0 ? { recovered_pence: String(recovered), stylist_account: account ?? "" } : {};

/** On an update: Stripe merges metadata, so an earlier recovery is cleared unless this one replaces it. */
export const CLEAR_RECOVERY = { recovered_pence: "", stylist_account: "" };
