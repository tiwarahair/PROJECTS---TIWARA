import type { ServiceId } from "./services";
import type { BraidSize, ColourId } from "./styles";

export type BookingStepIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

/**
 * 0 style · 1 when & where · 2 stylist · 3 customise
 * 4 date & time · 5 details · 6 review · 7 confirmation
 */
export const TOTAL_BOOKING_STEPS = 8;

/**
 * Booking runs one of two sequences. Opening from a stylist — their profile,
 * or "Book now" on a search card — skips "when & where" and the stylist
 * picker, because both questions are already answered.
 */
export const BOOKING_STEP = {
  style: 0,
  whenWhere: 1,
  stylist: 2,
  customise: 3,
  schedule: 4,
  details: 5,
  review: 6,
  confirm: 7,
} as const satisfies Record<string, BookingStepIndex>;

export const FULL_SEQUENCE: readonly BookingStepIndex[] = [
  BOOKING_STEP.style,
  BOOKING_STEP.whenWhere,
  BOOKING_STEP.stylist,
  BOOKING_STEP.customise,
  BOOKING_STEP.schedule,
  BOOKING_STEP.details,
  BOOKING_STEP.review,
  BOOKING_STEP.confirm,
];

export const STYLIST_KNOWN_SEQUENCE: readonly BookingStepIndex[] = [
  BOOKING_STEP.style,
  BOOKING_STEP.customise,
  BOOKING_STEP.schedule,
  BOOKING_STEP.details,
  BOOKING_STEP.review,
  BOOKING_STEP.confirm,
];

export interface CalendarDay {
  day: number;
  available: boolean;
  isToday: boolean;
}

export interface TimeSlot {
  id: string;
  label: string;
  taken: boolean;
}

export interface BookingDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes: string;
}

export interface BookingTotals {
  total: number;
  /** Informational 2% platform fee; not added to the total or deposit. */
  fee: number;
  deposit: number;
  balance: number;
}

/** What the review and confirmation steps display, derived from live state. */
export interface ReviewSnapshot {
  service: string;
  colour: string;
  length: string;
  size: BraidSize;
  money: BookingTotals;
}

export interface BookingState {
  categoryKey: ServiceId;
  step: BookingStepIndex;
  styleId: string | null;
  /** Step 1 — the window the client is free in, and where they are. */
  dateFrom: string;
  dateTo: string;
  location: string;
  /** Step 2 — the stylist picked from the filtered list. */
  stylistId: string | null;
  colourId: ColourId;
  lengthIndex: number;
  size: BraidSize;
  addOnIds: string[];
  dayNumber: number | null;
  timeSlotId: string | null;
  details: BookingDetails;
}
