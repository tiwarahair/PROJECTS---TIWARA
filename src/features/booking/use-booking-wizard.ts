import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_COLOUR_ID, findColourById } from "../../data/colours";
import { DEFAULT_LENGTH_INDEX, lengthLabel } from "../../data/lengths";
import { ADD_ONS } from "../../data/booking-calendar";
import {
  getService,
  getIndividualService,
} from "../../data/service-categories";
import { calcDeposit } from "../../utils/money";
import type {
  BookingDetails,
  BookingState,
  BookingStepIndex,
  BookingTotals,
  BraidSize,
  ReviewSnapshot,
} from "../../types/booking";
import { TOTAL_BOOKING_STEPS } from "../../types/booking";
import type { ColourId, ServiceCategoryKey } from "../../types/domain";
import type { BookingSession } from "../../stores/overlays-slice";

// TO DO: READ FILE
// TO DO: Move this into the store so the wizard can be rehydrated on refresh. The current implementation is a direct port of the original, which kept the state in the DOM and lost it on refresh. The store would also allow the wizard to be opened from a search card without losing the chosen stylist, and to be rehydrated if the user navigates away and back again.

/** Style selection slides to the customise step after a short beat. */
const AUTO_ADVANCE_MS = 320;

/** Fallback price when no style has been chosen yet. */
const FALLBACK_BASE_PRICE = 130;

const EMPTY_DETAILS: BookingDetails = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  notes: "",
};

/**
 * What the review step shows before any summary has been captured. These were
 * hardcoded in the original markup, money rows included.
 */
const INITIAL_REVIEW: ReviewSnapshot = {
  service: "—",
  colour: "1B Natural Black",
  length: 'Medium (14–18")',
  size: "Medium",
  money: { total: 130, deposit: 32.5, balance: 97.5 },
};

export interface BookingWizard {
  booking: BookingState;
  selectStyle: (styleId: string) => void;
  selectColour: (colourId: ColourId) => void;
  selectLength: (index: number) => void;
  selectSize: (size: BraidSize) => void;
  toggleAddOn: (addOnId: string) => void;
  selectDay: (day: number) => void;
  selectTime: (slotId: string) => void;
  updateDetails: (patch: Partial<BookingDetails>) => void;
  goNext: () => void;
  goPrev: () => void;
}

function initialState(categoryKey: ServiceCategoryKey): BookingState {
  return {
    categoryKey,
    step: 0,
    styleId: null,
    colourId: DEFAULT_COLOUR_ID,
    lengthIndex: DEFAULT_LENGTH_INDEX,
    size: "Medium",
    addOnIds: [],
    dayNumber: null,
    timeSlotId: null,
    details: EMPTY_DETAILS,
    review: INITIAL_REVIEW,
  };
}

/** Chosen style's base price plus any ticked add-ons. */
export function totalsOf(state: BookingState): BookingTotals {
  const style = getIndividualService(state.categoryKey, state.styleId);
  const base = style?.base ?? FALLBACK_BASE_PRICE;

  let addOnTotal = 0;
  for (const addOn of ADD_ONS) {
    if (state.addOnIds.includes(addOn.id)) addOnTotal += addOn.price;
  }

  const total = base + addOnTotal;
  const deposit = calcDeposit(total);
  return { total, deposit, balance: total - deposit };
}

function snapshotOf(state: BookingState): ReviewSnapshot {
  const style = getIndividualService(state.categoryKey, state.styleId);
  return {
    service: style?.name ?? "—",
    colour: findColourById(state.colourId).name,
    length: lengthLabel(state.lengthIndex),
    size: state.size,
    money: totalsOf(state),
  };
}

export function useBookingWizard(session: BookingSession): BookingWizard {
  const [booking, setBooking] = useState<BookingState>(() =>
    initialState(session.categoryKey),
  );

  // Read inside the auto-advance timer so it sees the step at fire time.
  const stepRef = useRef(booking.step);
  stepRef.current = booking.step;

  // Opening a booking resets the category, step, style, colour and length —
  // and nothing else. Size, add-ons, the chosen day and time, and the details
  // form all survive into the next booking, exactly as they did before.
  useEffect(() => {
    setBooking((current) => ({
      ...current,
      categoryKey: session.categoryKey,
      step: 0,
      styleId: null,
      colourId: DEFAULT_COLOUR_ID,
      lengthIndex: DEFAULT_LENGTH_INDEX,
    }));
  }, [session.sessionId, session.categoryKey]);

  const goToStep = useCallback((step: BookingStepIndex) => {
    setBooking((current) => ({ ...current, step }));
  }, []);

  const selectStyle = useCallback(
    (styleId: string) => {
      setBooking((current) => ({ ...current, styleId }));
      // Scheduled from the handler rather than an effect: two quick clicks
      // queue two timers, and the second is a no-op because the step has
      // already moved on. An effect with cleanup would cancel the first timer
      // and delay the advance to 320ms after the *second* click.
      setTimeout(() => {
        if (stepRef.current === 0) goToStep(1);
      }, AUTO_ADVANCE_MS);
    },
    [goToStep],
  );

  const selectColour = useCallback((colourId: ColourId) => {
    setBooking((current) => ({ ...current, colourId }));
  }, []);

  const selectLength = useCallback((lengthIndex: number) => {
    setBooking((current) => ({ ...current, lengthIndex }));
  }, []);

  const selectSize = useCallback((size: BraidSize) => {
    setBooking((current) => ({ ...current, size }));
  }, []);

  const toggleAddOn = useCallback((addOnId: string) => {
    setBooking((current) => {
      const next = {
        ...current,
        addOnIds: current.addOnIds.includes(addOnId)
          ? current.addOnIds.filter((id) => id !== addOnId)
          : [...current.addOnIds, addOnId],
      };
      // Ticking an add-on refreshed the money rows even though the rest of the
      // summary stayed stale — the checkbox called calcTotal() directly.
      return { ...next, review: { ...next.review, money: totalsOf(next) } };
    });
  }, []);

  const selectDay = useCallback((dayNumber: number) => {
    setBooking((current) => ({ ...current, dayNumber }));
  }, []);

  const selectTime = useCallback((timeSlotId: string) => {
    setBooking((current) => ({ ...current, timeSlotId }));
  }, []);

  const updateDetails = useCallback((patch: Partial<BookingDetails>) => {
    setBooking((current) => ({
      ...current,
      details: { ...current.details, ...patch },
    }));
  }, []);

  const goNext = useCallback(() => {
    setBooking((current) => {
      // Continuing from the style step without a choice picks the first style.
      const styleId =
        current.step === 0 && !current.styleId
          ? (getService(current.categoryKey).styles[0]?.id ?? null)
          : current.styleId;

      // The summary is captured on the way OUT of step 4, not on the way in,
      // so the review step shows whatever was captured last time. This is the
      // original's off-by-one, preserved deliberately — see the
      // behaviour-parity register in the migration plan.
      const review = current.step === 4 ? snapshotOf(current) : current.review;

      return {
        ...current,
        styleId,
        review,
        step: Math.min(
          TOTAL_BOOKING_STEPS - 1,
          current.step + 1,
        ) as BookingStepIndex,
      };
    });
  }, []);

  const goPrev = useCallback(() => {
    setBooking((current) => ({
      ...current,
      step: Math.max(0, current.step - 1) as BookingStepIndex,
    }));
  }, []);

  return {
    booking,
    selectStyle,
    selectColour,
    selectLength,
    selectSize,
    toggleAddOn,
    selectDay,
    selectTime,
    updateDetails,
    goNext,
    goPrev,
  };
}
