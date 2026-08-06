import type { ServiceId } from "./services";
import type { BraidSize, ColourId } from "./styles";

export type BookingStepIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/**
 * 0 service · 1 style · 2 when & where · 3 stylist · 4 customise
 * 5 date & time · 6 details · 7 review · 8 confirmation
 */
export const TOTAL_BOOKING_STEPS = 9;

export const BOOKING_STEP = {
  service: 0,
  style: 1,
  whenWhere: 2,
  stylist: 3,
  customise: 4,
  schedule: 5,
  details: 6,
  review: 7,
  confirm: 8,
} as const satisfies Record<string, BookingStepIndex>;

const EVERY_STEP: readonly BookingStepIndex[] = [
  BOOKING_STEP.service,
  BOOKING_STEP.style,
  BOOKING_STEP.whenWhere,
  BOOKING_STEP.stylist,
  BOOKING_STEP.customise,
  BOOKING_STEP.schedule,
  BOOKING_STEP.details,
  BOOKING_STEP.review,
  BOOKING_STEP.confirm,
];

/**
 * Only steps the booking *cannot* answer drop out. Opening from a stylist —
 * their profile, or "Book now" on a search card — makes "when & where" and the
 * stylist picker meaningless, because the stylist is already settled. A service
 * with nothing to customise drops that step for the same reason.
 *
 * A service or style supplied by the entry point is merely pre-answered, not
 * unavailable, so those steps stay in the sequence and remain reachable with
 * Back. `firstUnansweredStep` is what skips past them on the way in.
 */
export const buildSequence = ({
  stylistId,
  customisable,
}: BookingContext): readonly BookingStepIndex[] => {
  const dropped = new Set<BookingStepIndex>();
  if (stylistId) {
    dropped.add(BOOKING_STEP.whenWhere);
    dropped.add(BOOKING_STEP.stylist);
  }
  if (!customisable) dropped.add(BOOKING_STEP.customise);

  return dropped.size
    ? EVERY_STEP.filter((step) => !dropped.has(step))
    : EVERY_STEP;
};

/** Where the overlay opens: the earliest step the URL has not already answered. */
export const firstUnansweredStep = (
  context: BookingContext,
): BookingStepIndex => {
  const { serviceId, styleId } = context;
  const sequence = buildSequence(context);
  const answered = (step: BookingStepIndex) =>
    (step === BOOKING_STEP.service && serviceId !== null) ||
    (step === BOOKING_STEP.style && styleId !== null);

  return sequence.find((step) => !answered(step)) ?? sequence[0]!;
};

const getPosition = (
  sequence: readonly BookingStepIndex[],
  step: BookingStepIndex,
) => sequence.indexOf(step);

/** Clamped at the end, so the last step's "next" is itself. */
export const nextStep = (
  sequence: readonly BookingStepIndex[],
  step: BookingStepIndex,
): BookingStepIndex => {
  const position = getPosition(sequence, step);
  if (position === -1) return sequence[0] ?? step;
  return sequence[Math.min(sequence.length - 1, position + 1)] ?? step;
};

/** Clamped at the start, so the first step's "previous" is itself. */
export const prevStep = (
  sequence: readonly BookingStepIndex[],
  step: BookingStepIndex,
): BookingStepIndex => {
  const position = getPosition(sequence, step);
  if (position === -1) return sequence[0] ?? step;
  return sequence[Math.max(0, position - 1)] ?? step;
};

/**
 * What the URL supplies about a booking: which service, which style, and whose.
 * Every field is already validated against the stylist's offerings — anything
 * they do not provide arrives here as null.
 */
export interface BookingContext {
  serviceId: ServiceId | null;
  styleId: string | null;
  /** Resolved from the `stylist` slug; its presence shortens the sequence. */
  stylistId: string | null;
  /** Whether `serviceId` has anything to customise; true while none is chosen. */
  customisable: boolean;
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

/** Everything the wizard collects. The current step lives in the URL, not here. */
export interface BookingState {
  /** Null until the service step is answered. */
  serviceId: ServiceId | null;
  styleId: string | null;
  /** When & where — the window the client is free in, and where they are. */
  dateFrom: string;
  dateTo: string;
  location: string;
  /** The stylist picked from the filtered list. */
  stylistId: string | null;
  colourId: ColourId;
  lengthIndex: number;
  size: BraidSize;
  addOnIds: string[];
  dayNumber: number | null;
  timeSlotId: string | null;
  details: BookingDetails;
}
