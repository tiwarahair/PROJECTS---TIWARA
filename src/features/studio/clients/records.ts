import type { StudioClientRow } from "../../../lib/studio-api/clients";
import type { StudioClient } from "../core/types";
import { toPounds } from "../../../utils/money";

const formatDate = (date: string | Date, options: Intl.DateTimeFormatOptions) =>
  new Date(date).toLocaleDateString("en-GB", {
    timeZone: "Europe/London",
    ...options,
  });

const getAllergyNote = ({
  allergies_by: addedBy,
  allergies_at: addedAt,
}: StudioClientRow) =>
  [
    `Added by ${addedBy || "the client"}`,
    addedAt && formatDate(addedAt, { day: "numeric", month: "short" }),
  ]
    .filter(Boolean)
    .join(" on ");

export const toStudioClient = (row: StudioClientRow): StudioClient => ({
  id: row.id,
  name: [row.first, row.last].filter(Boolean).join(" "),
  first: row.first,
  phone: row.phone ?? "",
  email: row.email ?? "",
  img: row.photo_url,
  photoPath: row.photo_path ?? "",
  blocked: row.blocked,
  visits: row.visits,
  last: row.last_visit
    ? formatDate(row.last_visit, { day: "numeric", month: "short" })
    : "",
  lastAt: row.last_visit,
  since: formatDate(row.created_at, { month: "short", year: "numeric" }),
  spent: toPounds(row.paid_pence),
  notes: { products: row.hair_notes ?? "" },
  sensitivities: row.allergies ?? "",
  ...(row.allergies ? { sensitivitiesNote: getAllergyNote(row) } : {}),
  money: {
    deposits: toPounds(row.booking_paid_pence),
    fees: toPounds(row.fee_paid_pence),
    refunds: toPounds(row.refund_pence),
  },
  noShows: row.no_shows,
  lateCancels: row.late_cancels,
});
