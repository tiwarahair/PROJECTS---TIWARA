// Bookings from the database → Studio's upcoming bookings, past appointments and their clients.
import type { StudioBookingRow } from "../../../lib/studio-api";
import type { AddressValue } from "../../../types/address";
import { getAddressOneLine } from "../../../utils/address";
import { formatDuration } from "../../../utils/dates";
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
import type { PastRecord, StudioBooking, StudioClient } from "../core/types";

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

const getPence = (value: unknown, key: string) => {
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

export const toStudioBooking = (row: StudioBookingRow): StudioBooking => {
  const { time } = toLondonTime(row.starts_at);
  const mode = getText(row.terms, "mode");
  const grace = isRecord(row.terms) ? row.terms.grace_minutes : undefined;

  return {
    id: getLocalId(row.id),
    remoteId: row.id,
    startsAt: row.starts_at,
    overlapOk: row.overlap_ok,
    grace: typeof grace === "number" ? grace : undefined,
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

  const getMeta = () => {
    if (refunded) return "Refunded";

    return getPence(row.cancellation, "kept_pence")
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
    status,
    at: Date.parse(markedAt),
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
    ...getFeeFlags(fee),
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

/** Upcoming bookings, past appointments (latest change first) and everyone who booked. */
export const toStudioBookings = (rows: StudioBookingRow[]) => {
  const clients = new Map(rows.map((row) => [getClientKey(row), row]));

  return {
    bookings: rows
      .filter(({ status }) => status in UPCOMING_STATUSES)
      .map(toStudioBooking),
    pastNew: rows
      .filter(({ status }) => status in PAST_STATUSES)
      .map(toPastRecord)
      .sort((first, second) => (second.at ?? 0) - (first.at ?? 0)),
    bookingClients: [...clients.values()].map(toBookingClient),
  };
};
