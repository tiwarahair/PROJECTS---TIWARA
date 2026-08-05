import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_COLOUR_ID,
  findColourById,
} from "../../data/style-config/colours";
import {
  DEFAULT_LENGTH_INDEX,
  lengthLabel,
} from "../../data/style-config/lengths";
import { calcDeposit, calcPlatformFee } from "../../utils/money";
import { defaultDateWindow } from "../../utils/dates";
import type {
  BookingDetails,
  BookingState,
  BookingStepIndex,
  BookingTotals,
  ReviewSnapshot,
} from "../../types/booking";
import {
  BOOKING_STEP,
  FULL_SEQUENCE,
  STYLIST_KNOWN_SEQUENCE,
  nextStep,
  prevStep,
} from "../../types/booking";
import type { BookingContext } from "../../types/booking";
import type { BraidSize, ColourId } from "../../types/styles";
import { getIndividualService, getService } from "../../data/services/services";
import { ADD_ON_OPTIONS } from "../../data/style-config/add-ons";

// TO DO: persist this so a refresh mid-booking does not lose the answers.
// The step survives a refresh because it is in the URL; everything the client
// has typed does not. <<<

/** Style selection slides to the next step after a short beat. */
const AUTO_ADVANCE_MS = 320;

/** Picking a stylist advances slightly more slowly, matching the new-ui flow. */
const STYLIST_ADVANCE_MS = 300;

const EMPTY_DETAILS: BookingDetails = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  notes: "",
};

export interface BookingWizard {
  booking: BookingState;
  /** The step the URL currently points at. */
  step: BookingStepIndex;
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

function initialState({
  categoryKey,
  stylistId,
}: BookingContext): BookingState {
  return {
    categoryKey,
    styleId: null,
    ...defaultDateWindowFields(),
    location: "",
    stylistId,
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
  const style = getIndividualService(state.styleId, state.categoryKey);
  const base = style?.defaultPrice ?? 0;

  let addOnTotal = 0;
  for (const { id, addedCost = 0 } of ADD_ON_OPTIONS) {
    if (state.addOnIds.includes(id)) addOnTotal += addedCost;
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
  const style = getIndividualService(state.styleId, state.categoryKey);
  return {
    service: style?.label ?? "—",
    colour: findColourById(state.colourId).name,
    length: lengthLabel(state.lengthIndex),
    size: state.size,
    money: totalsOf(state),
  };
}

export interface BookingWizardOptions {
  context: BookingContext;
  /** The step the URL points at. */
  step: BookingStepIndex;
  /** True while the booking surface is on screen. */
  open: boolean;
  /** Navigates to a step, preserving the booking's query params. */
  goToStep: (step: BookingStepIndex) => void;
}

export function useBookingWizard({
  context,
  step,
  open,
  goToStep,
}: BookingWizardOptions): BookingWizard {
  const [booking, setBooking] = useState<BookingState>(() =>
    initialState(context),
  );

  // Opening from a stylist answers "when & where" and "which stylist", so
  // those two steps drop out of the flow entirely.
  const sequence = context.stylistId ? STYLIST_KNOWN_SEQUENCE : FULL_SEQUENCE;

  // Read inside the auto-advance timer so it sees the step at fire time.
  const stepRef = useRef(step);
  stepRef.current = step;

  // Every booking starts clean
  const { categoryKey, stylistId } = context;
  useEffect(() => {
    if (!open) return;
    setBooking(initialState({ categoryKey, stylistId }));
  }, [open, categoryKey, stylistId]);

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
    // Continuing from the style step without a choice picks the first style.
    if (step === BOOKING_STEP.style) {
      setBooking((current) => ({
        ...current,
        styleId:
          current.styleId ??
          getService(current.categoryKey).individualServices[0]?.id ??
          null,
      }));
    }
    goToStep(nextStep(sequence, step));
  }, [goToStep, sequence, step]);

  const goPrev = useCallback(() => {
    goToStep(prevStep(sequence, step));
  }, [goToStep, sequence, step]);

  return {
    booking,
    step,
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
