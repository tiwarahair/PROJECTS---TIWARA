import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_COLOUR_ID,
  findColourById,
} from "../../data/style-config/colours";
import {
  DEFAULT_LENGTH_ID,
  lengthLabel,
} from "../../data/style-config/lengths";
import {
  DEFAULT_HAIR_TEXTURE_ID,
  hairTextureLabel,
} from "../../data/style-config/hair-textures";
import { calcDeposit, calcPlatformFee } from "../../utils/money";
import { defaultDateWindow } from "../../utils/dates";
import type {
  BookingDetails,
  BookingState,
  BookingStepIndex,
  BookingTotals,
  PaymentPlan,
  ReviewSnapshot,
} from "../../types/booking";
import {
  BOOKING_STEP,
  buildSequence,
  nextStep,
  prevStep,
} from "../../types/booking";
import type { BookingContext } from "../../types/booking";
import type {
  BraidSize,
  ColourId,
  HairTextureId,
  LengthId,
} from "../../types/styles";
import type { CustomisableGroup, ServiceId } from "../../types/services";
import { getIndividualService, getService } from "../../data/services/services";
import { getOfferedStyles, getStyleRate } from "../../data/stylist/stylist";
import { getServiceAddOns } from "../../data/style-config/add-ons";

// TO DO: persist this so a refresh mid-booking does not lose the answers.
// The step survives a refresh because it is in the URL; everything the client
// has typed does not. <<<

/** Service and style selection slide to the next step after a short beat. */
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
  selectService: (serviceId: ServiceId) => void;
  selectStyle: (styleId: string) => void;
  setDateRange: (dateFrom: string, dateTo: string) => void;
  setLocation: (location: string) => void;
  selectStylist: (stylistId: string) => void;
  selectColour: (colourId: ColourId) => void;
  selectLength: (lengthId: LengthId) => void;
  selectHairTexture: (hairTextureId: HairTextureId) => void;
  selectSize: (size: BraidSize) => void;
  toggleAddOn: (addOnId: string) => void;
  selectDay: (day: number) => void;
  selectTime: (slotId: string) => void;
  selectPaymentPlan: (paymentPlan: PaymentPlan) => void;
  updateDetails: (patch: Partial<BookingDetails>) => void;
  goNext: () => void;
  goPrev: () => void;
}

/**
 * Records a group as chosen, once. Re-picking within a group the client has
 * already answered leaves the list — and so the progress bar — untouched.
 */
function withGroupChosen(state: BookingState, group: CustomisableGroup) {
  if (state.chosenGroups.includes(group)) return {};
  return { chosenGroups: [...state.chosenGroups, group] };
}

/** Fresh today→+30 window; re-evaluated on every open so it never goes stale. */
function defaultDateWindowFields() {
  const { from, to } = defaultDateWindow();
  return { dateFrom: from, dateTo: to };
}

type BookingAnswers = Pick<
  BookingContext,
  "serviceId" | "styleId" | "stylistId"
>;

function initialState({
  serviceId,
  styleId,
  stylistId,
}: BookingAnswers): BookingState {
  return {
    serviceId,
    styleId,
    ...defaultDateWindowFields(),
    location: "",
    stylistId,
    colourId: DEFAULT_COLOUR_ID,
    lengthId: DEFAULT_LENGTH_ID,
    hairTextureId: DEFAULT_HAIR_TEXTURE_ID,
    size: "Medium",
    addOnIds: [],
    chosenGroups: [],
    dayNumber: null,
    timeSlotId: null,
    paymentPlan: "deposit",
    details: EMPTY_DETAILS,
  };
}

/**
 * The stylist's rate for the chosen style, plus any ticked add-ons. Add-ons are
 * priced from the current service's list, so a tick left over from a previous
 * service can never be charged. Everything is integer pence.
 */
export function totalsOf(state: BookingState): BookingTotals {
  const { serviceId, styleId, stylistId, addOnIds, paymentPlan } = state;
  const base = serviceId
    ? getStyleRate(styleId, serviceId, stylistId).pricePence
    : 0;

  let addOnTotal = 0;
  if (serviceId) {
    for (const { id, addedCostPence = 0 } of getServiceAddOns(serviceId)) {
      if (addOnIds.includes(id)) addOnTotal += addedCostPence;
    }
  }

  const total = base + addOnTotal;

  const fee = calcPlatformFee(total);
  const deposit = calcDeposit(total, fee);
  const totalPlusFee = total + fee;
  const dueNow = paymentPlan === "full" ? totalPlusFee : deposit;

  return {
    total,
    totalPlusFee,
    fee,
    deposit,
    dueNow,
    balance: totalPlusFee - dueNow,
  };
}

function snapshotOf(state: BookingState): ReviewSnapshot {
  const { styleId, serviceId, colourId, lengthId, hairTextureId } = state;
  const style = getIndividualService(styleId, serviceId ?? undefined);
  const collectsTexture = Boolean(
    serviceId && getService(serviceId).configs?.hairTexture,
  );

  return {
    service: style?.label ?? "—",
    colour: findColourById(colourId).name,
    length: lengthLabel(lengthId),
    size: state.size,
    hairTexture: collectsTexture ? hairTextureLabel(hairTextureId) : null,
    paymentPlan: state.paymentPlan,
    money: totalsOf(state),
  };
}

export interface BookingWizardOptions {
  context: BookingContext;
  /** The step the URL points at. */
  step: BookingStepIndex;
  /** True while the booking surface is on screen. */
  open: boolean;
  /**
   * Navigates to a step, preserving the booking's query params. Passing a
   * service replaces `?service=` and drops any pre-picked `?style=`, which
   * would otherwise point at a style the new service does not contain.
   */
  goToStep: (step: BookingStepIndex, service?: ServiceId) => void;
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

  const { serviceId, styleId, stylistId, customisable } = context;
  const sequence = useMemo(
    () => buildSequence({ serviceId, styleId, stylistId, customisable }),
    [serviceId, styleId, stylistId, customisable],
  );

  // Read inside the auto-advance timer so it sees the step at fire time.
  const stepRef = useRef(step);
  stepRef.current = step;

  // Every booking starts clean. Changing the service mid-flow lands here too,
  // and wipes everything: each service offers a different set of
  // customisations, so nothing collected under the old one still applies.
  useEffect(() => {
    if (!open) return;
    setBooking(initialState({ serviceId, styleId, stylistId }));
  }, [open, serviceId, styleId, stylistId]);

  /**
   * Scheduled from the handler rather than an effect: two quick clicks queue
   * two timers, and the second is a no-op because the step has already moved
   * on. An effect with cleanup would cancel the first timer and delay the
   * advance to 320ms after the *second* click.
   */
  const advanceFrom = useCallback(
    (from: BookingStepIndex, delay: number, service?: ServiceId) => {
      setTimeout(() => {
        if (stepRef.current === from)
          goToStep(nextStep(sequence, from), service);
      }, delay);
    },
    [goToStep, sequence],
  );

  const selectService = useCallback(
    (serviceId: ServiceId) => {
      setBooking((current) => ({ ...current, serviceId, styleId: null }));
      advanceFrom(BOOKING_STEP.service, AUTO_ADVANCE_MS, serviceId);
    },
    [advanceFrom],
  );

  const selectStyle = useCallback(
    (styleId: string) => {
      setBooking((current) => ({ ...current, styleId }));
      advanceFrom(BOOKING_STEP.style, AUTO_ADVANCE_MS);
    },
    [advanceFrom],
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
      advanceFrom(BOOKING_STEP.stylist, STYLIST_ADVANCE_MS);
    },
    [advanceFrom],
  );

  const selectColour = useCallback((colourId: ColourId) => {
    setBooking((current) => ({
      ...current,
      colourId,
      ...withGroupChosen(current, "colour"),
    }));
  }, []);

  const selectLength = useCallback((lengthId: LengthId) => {
    setBooking((current) => ({
      ...current,
      lengthId,
      ...withGroupChosen(current, "length"),
    }));
  }, []);

  const selectHairTexture = useCallback((hairTextureId: HairTextureId) => {
    setBooking((current) => ({
      ...current,
      hairTextureId,
      ...withGroupChosen(current, "hairTexture"),
    }));
  }, []);

  const selectSize = useCallback((size: BraidSize) => {
    setBooking((current) => ({
      ...current,
      size,
      ...withGroupChosen(current, "size"),
    }));
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

  const selectPaymentPlan = useCallback((paymentPlan: PaymentPlan) => {
    setBooking((current) => ({ ...current, paymentPlan }));
  }, []);

  const updateDetails = useCallback((patch: Partial<BookingDetails>) => {
    setBooking((current) => ({
      ...current,
      details: { ...current.details, ...patch },
    }));
  }, []);

  const goNext = useCallback(() => {
    // Continuing from the style step without a choice picks the first style
    // this stylist offers.
    if (step === BOOKING_STEP.style) {
      setBooking((current) => ({
        ...current,
        styleId:
          current.styleId ??
          (current.serviceId
            ? (getOfferedStyles(current.stylistId, current.serviceId)[0]?.id ??
              null)
            : null),
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
    selectService,
    selectStyle,
    setDateRange,
    setLocation,
    selectStylist,
    selectColour,
    selectLength,
    selectHairTexture,
    selectSize,
    toggleAddOn,
    selectDay,
    selectTime,
    selectPaymentPlan,
    updateDetails,
    goNext,
    goPrev,
  };
}
