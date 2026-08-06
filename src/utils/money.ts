/**
 * Every amount in this module is an integer number of pence. Nothing here
 * takes or returns pounds — the price data is stored in pence too, so a value
 * only becomes a decimal at the moment it is formatted for display.
 */

export const DEPOSIT_RATE = 0.25;

/**
 * Shown on the review step for transparency. It is informational only — the
 * deposit and balance are still worked out from the total, not total + fee.
 */
export const PLATFORM_FEE_RATE = 0.02;

export const calcPlatformFee = (totalPence: number): number =>
  Math.round(totalPence * PLATFORM_FEE_RATE);

/**
 * Moved to integer pence: there is now exactly one rounding
 * step, here, and the balance is defined as `total - dueNow` rather than being
 * rounded independently, so the parts always add back up to the total.
 */
export const calcDeposit = (totalPence: number, fee: number): number =>
  Math.round((totalPence + fee) * DEPOSIT_RATE);

/** Always two decimals — used for the deposit, balance and fee rows. */
export const formatPence = (pence: number): string =>
  `£${(pence / 100).toFixed(2)}`;

/** Drops the decimals on whole pounds, for the "from £130" style labels. */
export const formatPenceCompact = (pence: number): string =>
  pence % 100 === 0 ? `£${pence / 100}` : formatPence(pence);
