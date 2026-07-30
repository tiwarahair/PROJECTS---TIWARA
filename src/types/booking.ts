import type { ColourId, ServiceCategoryKey } from "./domain";

export type BraidSize = "Small" | "Medium" | "Large";
export type BookingStepIndex = 0 | 1 | 2 | 3 | 4 | 5;

export const TOTAL_BOOKING_STEPS = 6;

export interface AddOn {
  id: string;
  label: string;
  price: number;
}

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
  deposit: number;
  balance: number;
}

/**
 * What the review step displays. Held separately from live state on purpose —
 * see use-booking-wizard for why.
 */
export interface ReviewSnapshot {
  service: string;
  colour: string;
  length: string;
  size: BraidSize;
  money: BookingTotals;
}

export interface BookingState {
  categoryKey: ServiceCategoryKey;
  step: BookingStepIndex;
  styleId: string | null;
  colourId: ColourId;
  lengthIndex: number;
  size: BraidSize;
  addOnIds: string[];
  dayNumber: number | null;
  timeSlotId: string | null;
  details: BookingDetails;
  review: ReviewSnapshot;
}
