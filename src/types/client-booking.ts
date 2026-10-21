export type BookingStatus =
  | "awaiting_confirmation"
  | "confirmed"
  | "arrived"
  | "completed"
  | "cancelled"
  | "auto_cancelled"
  | "no_show";

export interface BookingPayment {
  kind: string;
  method: string;
  amountPence: number;
  paidAt: number;
}

export interface BookingRefund {
  amountPence: number;
  refundedAt: number;
}

export interface AccountBooking {
  id: string;
  ref: string;
  status: BookingStatus;
  service: string;
  customisation: string;
  stylistSlug: string;
  stylistName: string;
  stylistArea: string;
  cover: string;
  isMobile: boolean;
  where: string;
  at: number;
  minutes: number;
  /** The final price once the stylist has checked out, else the booked one. */
  pricePence: number;
  feePence: number;
  tipPence: number;
  mode: string;
  cardLabel: string | null;
  paymentMethodId: string | null;
  payments: BookingPayment[];
  refunds: BookingRefund[];
}
