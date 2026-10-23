// A booking's service details and booking protection from the database → the fields Studio's tiles and sheet read.
import type { StudioBookingRow } from "../../../lib/studio-api/bookings";
import type { BookingAddon, StudioBooking } from "../core/types";
import { toPounds } from "./fee-records";
import { getNumber, getText, isRecord } from "./row-values";

const toAddon = (line: unknown): BookingAddon => ({
  id: getText(line, "id"),
  addonId: getText(line, "id"),
  name: getText(line, "name"),
  price: toPounds(getNumber(line, "price_pence")),
  minutes: getNumber(line, "minutes"),
  quantity: getNumber(line, "quantity") || 1,
});

/** the service as booked: add-on lines (with this booking's own prices), extra time and why the price changed. */
export const getServiceFields = ({
  snapshot,
  buffer_minutes: extra,
  service_id: serviceId,
}: StudioBookingRow): Partial<StudioBooking> => {
  const addons =
    isRecord(snapshot) && Array.isArray(snapshot.addons) ? snapshot.addons : [];

  return {
    serviceId: serviceId ?? undefined,
    extra,
    ...(addons.length ? { addons: addons.map(toAddon) } : {}),
    ...(getText(snapshot, "price_reason")
      ? { priceReason: getText(snapshot, "price_reason") }
      : {}),
  };
};

/**
 * Protection as Studio shows it: a pending link (with its deadline, sends and amount), skipped ("No booking
 * protection"), or nothing to say. Once the client has paid or saved a card, the booking is theirs.
 */
export const getProtectionFields = (
  row: StudioBookingRow,
): Partial<StudioBooking> => {
  const mode = getText(row.terms, "mode") || "none";

  const isPending =
    row.status === "awaiting_confirmation" &&
    row.protection_status === "pending";

  return {
    protectionMode: mode,
    agreedDeposit: toPounds(getNumber(row.terms, "deposit_pence")),
    clientLocked: !!(
      row.paid_at ||
      row.stripe_payment_method_id ||
      row.protection_status === "protected"
    ),
    loggedAfterStart: Date.parse(row.created_at) >= Date.parse(row.starts_at),
    ...(row.protection_status === "overridden" ? { protect: "none" } : {}),
    ...(isPending
      ? {
          paid: "link",
          protect: "link",
          linkAmount: toPounds(row.due_today_pence ?? 0),
          resends: Math.max(0, row.confirm_sends - 1),
          ...(row.confirm_by ? { expiresAt: Date.parse(row.confirm_by) } : {}),
          ...(row.confirm_sent_at
            ? { linkSentAt: Date.parse(row.confirm_sent_at) }
            : {}),
        }
      : {}),
  };
};
