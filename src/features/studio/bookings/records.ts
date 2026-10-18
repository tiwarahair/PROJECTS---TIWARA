// Bookings from the database → Studio's upcoming bookings, past appointments and their clients.
import type {
  StudioBookingRow,
  StudioBookings,
} from "../../../lib/studio-api/bookings";
import type { AddressValue } from "../../../types/address";
import { getAddressOneLine } from "../../../utils/address";
import { formatDuration, LONG_MONTHS } from "../../../utils/dates";
import { fromLondonTime, toLondonTime } from "../../../utils/london-time";
import { toDate, toOffset } from "../core/blocked-time";
import {
  getFeeFlags,
  getLatestFee,
  getRefundNote,
  getRefunded,
  toPounds,
} from "./fee-records";
import { dateLabel } from "../core/format";
import type {
  PastRecord,
  StudioBooking,
  StudioClient,
  StudioPolicy,
} from "../core/types";
import { toFeeKind, toPolicyMode } from "../settings/records";

const UPCOMING_STATUSES: Record<string, string> = {
  awaiting_confirmation: "awaiting",
  confirmed: "confirmed",
  arrived: "arrived",
};

const PAST_STATUSES: Record<string, string> = {
  completed: "Completed",
  cancelled: "Cancelled",
  auto_cancelled: "Cancelled",
  no_show: "No show",
};

// Studio keys bookings by number; the same booking keeps its number for the whole visit
const localIds = new Map<string, number>();

const getLocalId = (remoteId: string) => {
  const known = localIds.get(remoteId);

  if (known) return known;

  const next = 100000 + localIds.size;

  localIds.set(remoteId, next);

  return next;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const getText = (value: unknown, key: string) => {
  const entry = isRecord(value) ? value[key] : undefined;

  return typeof entry === "string" ? entry : "";
};

const getNumber = (value: unknown, key: string) => {
  const entry = isRecord(value) ? value[key] : undefined;

  return typeof entry === "number" ? entry : 0;
};

const getClientKey = ({ id, contact }: StudioBookingRow) => {
  const contactKey =
    getText(contact, "email").toLowerCase() || getText(contact, "phone");

  return `contact:${contactKey || id}`;
};

const toAddress = (value: unknown): AddressValue | null =>
  isRecord(value)
    ? {
        line1: getText(value, "line1"),
        line2: getText(value, "line2"),
        town: getText(value, "town"),
        postcode: getText(value, "postcode"),
      }
    : null;

/** A day offset and clock time in Studio → the booking's start, for saving. */
export const toStartsAt = (dayOffset: number, time: string) =>
  fromLondonTime(toDate(dayOffset), time);

/** Days from today to the booking's UK date. */
export const toDayOffset = (startsAt: string) =>
  toOffset(toLondonTime(startsAt).date);

const toAgreedFee = (terms: Record<string, unknown>, prefix: string) => ({
  on: terms[`${prefix}_on`] === true,
  kind: toFeeKind(getText(terms, `${prefix}_kind`)),
  percent: getNumber(terms, `${prefix}_percent`),
});

/** The policy as agreed when the client booked, which fees and deadlines follow. */
const toAgreedPolicy = (terms: unknown): StudioPolicy | undefined =>
  isRecord(terms)
    ? {
        mode: toPolicyMode(getText(terms, "mode")),
        deposit: getNumber(terms, "deposit_percent"),
        refundable: terms.refundable === true,
        window: getNumber(terms, "free_window_hours"),
        grace: getNumber(terms, "grace_minutes"),
        late: toAgreedFee(terms, "late"),
        noShow: toAgreedFee(terms, "no_show"),
        extras: [],
      }
    : undefined;

export const toStudioBooking = (row: StudioBookingRow): StudioBooking => {
  const { time } = toLondonTime(row.starts_at);
  const mode = getText(row.terms, "mode");

  return {
    id: getLocalId(row.id),
    remoteId: row.id,
    startsAt: row.starts_at,
    overlapOk: row.overlap_ok,
    agreedPolicy: toAgreedPolicy(row.terms),
    freeCancelUntil: getText(row.terms, "free_cancel_until") || undefined,
    dayOffset: toDayOffset(row.starts_at),
    time,
    duration: formatDuration(row.minutes),
    client: getClientKey(row),
    service: getText(row.snapshot, "service_name"),
    price: toPounds(row.price_pence),
    note: row.notes ?? undefined,
    address: getAddressOneLine(toAddress(row.address)) || undefined,
    pending: false,
    status: UPCOMING_STATUSES[row.status] ?? "confirmed",
    paid: mode === "deposit" || mode === "full" ? mode : "none",
    movedByClient: row.reschedule_count > 0,
  };
};

const getCancelNote = (row: StudioBookingRow, refundNote: string) => {
  const who =
    row.cancelled_by === "stylist"
      ? "you"
      : getText(row.contact, "first") || "the client";

  return `Cancelled by ${who}.${refundNote}`;
};

export const toPastRecord = (row: StudioBookingRow): PastRecord => {
  const booking = toStudioBooking(row);
  const status = PAST_STATUSES[row.status] ?? "Completed";
  const fee = getLatestFee(row);
  const refunded = getRefunded(row);
  const refundNote = getRefundNote(refunded, fee);
  const markedAt = row.no_show_at ?? row.cancelled_at ?? row.starts_at;
  const pastAt = Date.parse(row.past_at ?? markedAt);

  const getMeta = () => {
    if (refunded) return "Refunded";

    return getNumber(row.cancellation, "kept_pence")
      ? "Deposit kept"
      : "No charge";
  };

  return {
    pastId: row.id,
    remoteId: row.id,
    client: booking.client,
    service: booking.service,
    price: booking.price,
    duration: booking.duration,
    when: dateLabel(booking.dayOffset),
    time: booking.time,
    month: getMonthLabel(row.starts_at),
    status,
    at: Date.parse(markedAt),
    pastAt,
    ...(status === "Cancelled"
      ? {
          meta: getMeta(),
          note: getCancelNote(row, refundNote),
          refunded: toPounds(refunded),
        }
      : {}),
    ...(status === "No show"
      ? {
          meta: getMeta(),
          note: `Client did not attend.${refundNote}`,
          refunded: toPounds(refunded),
          original: { ...booking, status: "confirmed" },
        }
      : {}),
    ...getFeeFlags(
      fee,
      row.payment_links.find(({ status }) => status === "pending"),
    ),
  };
};

export const toBookingClient = (row: StudioBookingRow): StudioClient => {
  const first = getText(row.contact, "first");
  const name = `${first} ${getText(row.contact, "last")}`.trim();

  return {
    id: getClientKey(row),
    name: name || "Client",
    first: first || "Client",
    phone: getText(row.contact, "phone"),
    email: getText(row.contact, "email"),
  };
};

export const isActiveRow = ({ status }: StudioBookingRow) =>
  status in UPCOMING_STATUSES;

export const isPastRow = ({ status }: StudioBookingRow) =>
  status in PAST_STATUSES;

/** Past newest first, in the database's own order, so pages join up. */
export const sortPast = (rows: PastRecord[]) =>
  rows.sort(
    (first, second) =>
      (second.pastAt ?? second.at ?? 0) - (first.pastAt ?? first.at ?? 0),
  );

/** "October", or "October 2025" for another year. */
const getMonthLabel = (startsAt: string) => {
  const [year = "", month = ""] = toLondonTime(startsAt).date.split("-");
  const name = LONG_MONTHS[Number(month) - 1] ?? "";

  return year === toLondonTime(new Date().toISOString()).date.slice(0, 4)
    ? name
    : `${name} ${year}`;
};

/** Studio's opening state: upcoming bookings, the first page of Past and everyone who booked. */
export const toStudioBookings = ({
  active,
  past,
  pastCursor,
}: StudioBookings) => {
  const clients = new Map(
    [...active, ...past].map((row) => [getClientKey(row), row]),
  );

  return {
    bookings: active.filter(isActiveRow).map(toStudioBooking),
    pastNew: sortPast(past.filter(isPastRow).map(toPastRecord)),
    bookingClients: [...clients.values()].map(toBookingClient),
    pastCursor,
  };
};
