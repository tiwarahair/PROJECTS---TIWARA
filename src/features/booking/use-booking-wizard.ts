import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_COLOUR_ID, findColourById } from "../../data/colours";
import { DEFAULT_LENGTH_INDEX, lengthLabel } from "../../data/lengths";
import { ADD_ONS } from "../../data/booking-calendar";
import {
  getService,
  getIndividualService,
} from "../../data/service-categories";
import { calcDeposit, calcPlatformFee } from "../../utils/money";
import { defaultDateWindow } from "../../utils/dates";
import type {
  BookingDetails,
  BookingState,
  BookingStepIndex,
  BookingTotals,
  BraidSize,
  ReviewSnapshot,
} from "../../types/booking";
import {
  BOOKING_STEP,
  FULL_SEQUENCE,
  STYLIST_KNOWN_SEQUENCE,
} from "../../types/booking";
import type { ColourId } from "../../types/domain";
import type { BookingSession } from "../../stores/overlays-slice";

// TO DO: READ FILE
// TO DO: Move this into the store so the wizard can be rehydrated on refresh. The current implementation is a direct port of the original, which kept the state in the DOM and lost it on refresh. The store would also allow the wizard to be opened from a search card without losing the chosen stylist, and to be rehydrated if the user navigates away and back again.

/** Style selection slides to the next step after a short beat. */
const AUTO_ADVANCE_MS = 320;

/** Picking a stylist advances slightly more slowly, matching the new-ui flow. */
const STYLIST_ADVANCE_MS = 300;

/** Fallback price when no style has been chosen yet. */
const FALLBACK_BASE_PRICE = 130;

const EMPTY_DETAILS: BookingDetails = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  notes: "",
};

export interface BookingWizard {
  booking: BookingState;
  /** The steps this booking actually visits, in order. */
  sequence: readonly BookingStepIndex[];
  /** Derived from live state, so the review step always reflects the choices. */
  review: ReviewSnapshot;
  selectStyle: (styleId: string) => void;
  setDateRange: (dateFrom: string, dateTo: string) => void;
  setLocation: (location: string) => void;
  selectStylist: (stylistId: string) => void;
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

/** Fresh today→+30 window; re-evaluated on every open so it never goes stale. */
function defaultDateWindowFields() {
  const { from, to } = defaultDateWindow();
  return { dateFrom: from, dateTo: to };
}

function initialState(session: BookingSession): BookingState {
  return {
    categoryKey: session.categoryKey,
    step: 0,
    styleId: null,
    ...defaultDateWindowFields(),
    location: "",
    stylistId: session.stylistId,
    colourId: DEFAULT_COLOUR_ID,
    lengthIndex: DEFAULT_LENGTH_INDEX,
    size: "Medium",
    addOnIds: [],
    dayNumber: null,
    timeSlotId: null,
    details: EMPTY_DETAILS,
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
  return {
    total,
    fee: calcPlatformFee(total),
    deposit,
    balance: total - deposit,
  };
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
    initialState(session),
  );

  // Opening from a stylist answers "when & where" and "which stylist", so
  // those two steps drop out of the flow entirely.
  const sequence = session.stylistId ? STYLIST_KNOWN_SEQUENCE : FULL_SEQUENCE;

  // Read inside the auto-advance timer so it sees the step at fire time.
  const stepRef = useRef(booking.step);
  stepRef.current = booking.step;

  // Opening a booking clears everything the first three steps collect. Size,
  // add-ons, the chosen day and time, and the details form still survive into
  // the next booking, as they did before.
  useEffect(() => {
    setBooking((current) => ({
      ...current,
      categoryKey: session.categoryKey,
      step: 0,
      styleId: null,
      ...defaultDateWindowFields(),
      location: "",
      stylistId: session.stylistId,
      colourId: DEFAULT_COLOUR_ID,
      lengthIndex: DEFAULT_LENGTH_INDEX,
    }));
  }, [session.sessionId, session.categoryKey, session.stylistId]);

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
        if (stepRef.current === BOOKING_STEP.style) {
          goToStep(sequence[1] ?? BOOKING_STEP.customise);
        }
      }, AUTO_ADVANCE_MS);
    },
    [goToStep, sequence],
  );

  const setDateRange = useCallback((dateFrom: string, dateTo: string) => {
    setBooking((current) => ({ ...current, dateFrom, dateTo }));
  }, []);

  const setLocation = useCallback((location: string) => {
    setBooking((current) => ({ ...current, location }));
  }, []);

  const selectStylist = useCallback(
    (stylistId: string) => {
      setBooking((current) => ({ ...current, stylistId }));
      setTimeout(() => {
        if (stepRef.current === BOOKING_STEP.stylist) {
          goToStep(BOOKING_STEP.customise);
        }
      }, STYLIST_ADVANCE_MS);
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
    setBooking((current) => ({
      ...current,
      addOnIds: current.addOnIds.includes(addOnId)
        ? current.addOnIds.filter((id) => id !== addOnId)
        : [...current.addOnIds, addOnId],
    }));
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
        current.step === BOOKING_STEP.style && !current.styleId
          ? (getService(current.categoryKey).styles[0]?.id ?? null)
          : current.styleId;

      const position = sequence.indexOf(current.step);
      const nextStep =
        sequence[Math.min(sequence.length - 1, position + 1)] ?? current.step;

      return { ...current, styleId, step: nextStep };
    });
  }, [sequence]);

  const goPrev = useCallback(() => {
    setBooking((current) => {
      const position = sequence.indexOf(current.step);
      const prevStep = sequence[Math.max(0, position - 1)] ?? current.step;
      return { ...current, step: prevStep };
    });
  }, [sequence]);

  return {
    booking,
    sequence,
    review: snapshotOf(booking),
    selectStyle,
    setDateRange,
    setLocation,
    selectStylist,
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
