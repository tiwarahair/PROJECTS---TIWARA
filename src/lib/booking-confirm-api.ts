// The public confirm page for a booking a stylist made: what's booked and due, and starting its payment.
import type { Tables } from "../types/database";
import { invokeBookingFunction } from "./booking-api";

export type BookingTerms = Omit<
  Tables<"payment_policies">,
  "id" | "stylist_id" | "created_at"
> & { deposit_pence: number; free_cancel_until: string };

export interface BookingConfirmation {
  state: "open" | "confirmed" | "changed" | "expired" | "unavailable";
  ref: string;
  service_name: string;
  stylist_name: string;
  stylist_slug: string;
  starts_at: string;
  ends_at: string;
  is_mobile: boolean;
  where: string;
  client_first: string;
  terms: BookingTerms;
  price_pence: number;
  fee_pence: number;
  due_pence: number;
  confirm_by: string;
}

export const fetchBookingConfirmation = (token: string) =>
  invokeBookingFunction<BookingConfirmation>("booking-confirm", {
    action: "view",
    token,
  });

export const startBookingConfirmation = (
  token: string,
  turnstileToken: string,
) =>
  invokeBookingFunction<{ clientSecret: string }>("booking-confirm", {
    action: "pay",
    token,
    turnstileToken,
  });
