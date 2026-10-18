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
  grace?: number;
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
  extra?: number;
  addons?: BookingAddon[];
  priceReason?: string;
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
  remoteId?: string;
  feeCharge?: number;
  feeCard?: string;
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
  checkout?: CheckoutRecord;
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
