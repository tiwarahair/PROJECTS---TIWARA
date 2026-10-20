// A client's dispute on a booking's payment, from the database → what Past and Earnings show.
import type { StudioBookingRow } from "../../../lib/studio-api/bookings";
import { formatWeekdayDate } from "../../../utils/dates";
import { formatMoney } from "../../../utils/money";
import type { DisputeRecord } from "../core/types";
import { toPounds } from "./fee-records";

// what the client told their bank, in Stripe's reasons
const REASONS: Record<string, string> = {
  fraudulent: "says they didn’t make this payment",
  duplicate: "says they were charged twice",
  product_not_received: "says the appointment didn’t happen",
  product_unacceptable: "says the service wasn’t as agreed",
  credit_not_processed: "says they were owed a refund",
  subscription_canceled: "says they were owed a refund",
};

export const getDisputeReason = (reason: string) =>
  REASONS[reason] ?? "disputed this payment";

/** still waiting for the stylist's evidence (an inquiry asks for it too) */
export const isAnswerable = ({ status, outcome }: DisputeRecord) =>
  !outcome &&
  (status === "needs_response" || status === "warning_needs_response");

type DisputeRow = Pick<
  StudioBookingRow["disputes"][number],
  | "id"
  | "amount_pence"
  | "reason"
  | "status"
  | "outcome"
  | "respond_by"
  | "returned_pence"
>;

export const toDisputeRecord = (row: DisputeRow): DisputeRecord => ({
  id: row.id,
  amount: toPounds(row.amount_pence),
  reason: row.reason ?? "",
  status: row.status,
  outcome: row.outcome,
  respondBy: row.respond_by ? Date.parse(row.respond_by) : 0,
  returned: toPounds(row.returned_pence),
});

/** the booking's latest dispute, if its client has raised one. */
export const getDisputeFields = ({ disputes }: StudioBookingRow) => {
  const latest = [...disputes].sort(
    (first, second) =>
      Date.parse(second.created_at) - Date.parse(first.created_at),
  )[0];

  return latest ? { dispute: toDisputeRecord(latest) } : {};
};

export const getTakenBack = ({ amount }: DisputeRecord) =>
  `Their bank has taken back ${formatMoney(amount, { pence: "always" })} while it decides.`;

export const getRespondBy = ({ respondBy }: DisputeRecord) =>
  respondBy ? `Respond by ${formatWeekdayDate(new Date(respondBy))}.` : "";
