// The public pay page for a fee the client's card declined.
import { invokeBookingFunction } from "./booking-api";

export interface PaymentLink {
  status: "pending" | "paid" | "expired" | "cancelled";
  kind: "late_cancel" | "no_show" | "balance";
  amount_pence: number;
  fee_pence: number;
  expires_at: string;
  ref: string;
  service_name: string;
  stylist_name: string;
  stylist_slug: string;
  starts_at: string;
}

export const fetchPaymentLink = (token: string) =>
  invokeBookingFunction<PaymentLink>("payment-link", { action: "view", token });

export const startLinkPayment = (token: string, turnstileToken: string) =>
  invokeBookingFunction<{ clientSecret: string }>("payment-link", {
    action: "pay",
    token,
    turnstileToken,
  });
