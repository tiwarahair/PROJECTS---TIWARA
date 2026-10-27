import type { AccountBooking, BookingStatus } from "../types/client-booking";
import { toPhotoUrl } from "./public-stylist";
import { supabase } from "./supabase";

interface SnapshotItem {
  label?: string;
  name?: string;
}

interface ClientBookingRow {
  id: string;
  ref: string;
  status: BookingStatus;
  snapshot: {
    service_name: string;
    options?: SnapshotItem[];
    addons?: SnapshotItem[];
    colour?: string | null;
  };
  starts_at: string;
  ends_at: string;
  stylist_slug: string;
  stylist_name: string;
  stylist_area: string | null;
  cover_path: string | null;
  is_mobile: boolean;
  where: string | null;
  price_pence: number;
  fee_pence: number;
  tip_pence: number;
  mode: string | null;
  card_label: string | null;
  payment_method_id: string | null;
  payments: {
    kind: string;
    method: string;
    amount_pence: number;
    paid_at: string;
  }[];
  refunds: { amount_pence: number; refunded_at: string }[];
}

const toBooking = ({
  snapshot: { service_name: service, options = [], addons = [], colour },
  starts_at: startsAt,
  ends_at: endsAt,
  ...row
}: ClientBookingRow): AccountBooking => {
  const at = Date.parse(startsAt);

  return {
    id: row.id,
    ref: row.ref,
    status: row.status,
    service,
    customisation: [
      ...options.map(({ label }) => label),
      colour,
      ...addons.map(({ name }) => name),
    ]
      .filter(Boolean)
      .join(" · "),
    stylistSlug: row.stylist_slug,
    stylistName: row.stylist_name,
    stylistArea: row.stylist_area ?? "",
    cover: row.cover_path ? toPhotoUrl(row.cover_path) : "",
    isMobile: row.is_mobile,
    where: row.where ?? "",
    at,
    minutes: Math.round((Date.parse(endsAt) - at) / 6e4),
    pricePence: row.price_pence,
    feePence: row.fee_pence,
    tipPence: row.tip_pence,
    mode: row.mode ?? "none",
    cardLabel: row.card_label,
    paymentMethodId: row.payment_method_id,
    payments: row.payments.map(
      ({ kind, method, amount_pence: amountPence, paid_at: paidAt }) => ({
        kind,
        method,
        amountPence,
        paidAt: Date.parse(paidAt),
      }),
    ),
    refunds: row.refunds.map(
      ({ amount_pence: amountPence, refunded_at: refundedAt }) => ({
        amountPence,
        refundedAt: Date.parse(refundedAt),
      }),
    ),
  };
};

export const fetchClientBookings = async (): Promise<AccountBooking[]> => {
  const { data, error } = await supabase.rpc("get_client_bookings");

  if (error) throw error;

  return (data as unknown as ClientBookingRow[]).map(toBooking);
};
