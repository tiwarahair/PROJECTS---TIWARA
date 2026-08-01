export const DEPOSIT_RATE = 0.25;

// TO DO: IS THE CALCULATION CORRECT?
/**
 * Deposit is rounded to the penny before formatting — the original did
 * `Math.round(total * 0.25 * 100) / 100` and then `.toFixed(2)`. Collapsing
 * that to a single toFixed changes half-penny cases.
 */
export function calcDeposit(total: number): number {
  return Math.round(total * DEPOSIT_RATE * 100) / 100;
}

export function formatPence(amount: number): string {
  return `£${amount.toFixed(2)}`;
}
