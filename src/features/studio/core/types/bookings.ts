import type { StudioPolicy } from "./settings";

export interface BookingAddon {
  addonId?: string;
  id?: string;
  name?: string;
  price?: number;
  minutes?: number;
  quantity?: number;
}

export interface StudioBooking {
  id: number;
  remoteId?: string;
  startsAt?: string;
  overlapOk?: boolean;
  /** The policy agreed at booking; demo bookings follow the current one. */
  agreedPolicy?: StudioPolicy;
  freeCancelUntil?: string;
  dayOffset: number;
  time: string;
  duration: string;
  client: string | null;
  service: string;
  price: number;
  note?: string;
  pending: boolean;
  status: string;
  paid: string;
  protect?: string;
  protectionMode?: string;
  resends?: number;
  linkSentAt?: number;
  expiresAt?: number;
  stylistNote?: string;
  address?: string;
  walkIn?: boolean;
  movedByClient?: boolean;
  autoDone?: boolean;
  checkoutUnpaid?: boolean;
  paidSoFar?: number;
  agreedPrice?: number; // what the saved card can be charged up to, when the price shown is the final one
  extra?: number;
  addons?: BookingAddon[];
  priceReason?: string;
  serviceId?: string;
  agreedDeposit?: number; // the deposit agreed for this booking (doesn't follow later price changes)
  linkAmount?: number; // what the client pays on their confirm link
  clientLocked?: boolean; // the client paid or saved a card, so they can't be swapped for someone else
  loggedAfterStart?: boolean;
  cardLabel?: string;
  hasSavedCard?: boolean;
  completed?: boolean;
}

export interface CheckoutRecord {
  method: string;
  via: string;
  charged: number;
  tip: number;
  refundAuto: number;
  total: number;
  lines: {
    name: string;
    subtitle: string;
    base: number;
    adjustment: number;
    reason: string;
  }[];
  mode: string;
  paid: number;
}

export interface PastRecord {
  pastId?: string | number;
  /** A real row's month heading ("October 2025") and when it joined Past, for sorting. */
  month?: string;
  pastAt?: number;
  remoteId?: string;
  feeCharge?: number;
  feeCard?: string;
  feeLinkResends?: number;
  /** Its settlement kept failing, so we're looking at it; nothing for the stylist to do. */
  feeStuck?: boolean;
  /** What a real client gets back if the fee is waived. */
  feeWaiveRefund?: number;
  client: string | null;
  service: string;
  price: number;
  when: string;
  time: string;
  status: string;
  duration?: string;
  at?: number;
  note?: string;
  meta?: string;
  feeKept?: boolean;
  feePending?: boolean;
  feeUnpaid?: boolean;
  feeLabel?: string;
  feeTries?: number;
  waived?: boolean;
  refunded?: number;
  refundReason?: string;
  linkPaid?: boolean;
  linkVia?: string;
  original?: StudioBooking;
  autoCancelled?: boolean; // happens when not confirmed in time -  a link can be sent again while its start is more than 2 hours away
  startsAt?: string;
  checkout?: CheckoutRecord;
  cardLabel?: string;
  recordedPayment?: {
    id: string;
    amount: number;
    tip: number;
    via: string;
    takenAt: number;
  };
  total?: number;
  paid?: number;
  method?: string;
}

export interface EditServiceDraft {
  serviceId: string | null;
  serviceName: string;
  taxonomyId: string | null;
  time: number;
  duration: number;
  price: string;
  originalPrice: string;
  priceOpen: boolean;
  priceReason: string;
  extra: number | null;
  addons: BookingAddon[];
}

export interface AddonEditDraft {
  context?: "add";
  id?: string;
  index?: number;
  name: string;
  price: string;
  hours: string;
  minutes: string;
  quantity: string;
}
