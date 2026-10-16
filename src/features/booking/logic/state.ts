// Booking's starting state: URL params, fixtures, saved addresses and the draft to resume.
import type { Service } from "../../../types/service";
import type { Stylist } from "../../../types/stylist";
import { getSearchParams } from "../../../utils/page-flags";
import { getSavedAddresses } from "../../../utils/saved-addresses";
import { findService, hasStep2 } from "../../../utils/services";
import { applyFixture } from "./fixtures";
import {
  DEFAULT_HOLD_SECONDS,
  EMPTY_ADDRESS,
  EMPTY_DETAILS,
} from "./constants";
import { getDraftPatch, readDraft } from "./draft";
import type { BookingAddress, BookingState, Selection } from "./types";

/** Default picks for a service: first option of each own customisation, colour 30 Auburn. */
export const getFreshSelection = (
  service: Service | null | undefined,
): Selection => {
  const own: Record<string, string | undefined> = {};

  for (const { name, options } of service?.ownCustomisations ?? [])
    own[name] = options[0]?.label;

  return { size: null, length: null, colour: "30 Auburn", own, addons: [] };
};

interface InitialBooking {
  state: BookingState;
  /** ?fixture=privacy opens the allergy field's privacy sheet. */
  openPrivacy: boolean;
  showErrors: boolean;
}

/** Skip straight past steps the preselected service doesn't need. */
const getStartStep = (service: Service | null): number => {
  if (!service) return 1;

  return hasStep2(service) ? 2 : 3;
};

/** Signed-in clients' saved addresses, the default one filled in. */
export const getSavedAddressPatch = (
  current: BookingAddress,
): Pick<BookingState, "saved" | "selectedAddressId" | "appointmentAddress"> => {
  const saved = getSavedAddresses();
  const defaultAddress = saved.find(({ isDefault }) => isDefault) ?? saved[0];

  return {
    saved,
    selectedAddressId: defaultAddress ? defaultAddress.id : "new",
    appointmentAddress: defaultAddress
      ? {
          ...current,
          line1: defaultAddress.line1,
          line2: defaultAddress.line2 || "",
          town: defaultAddress.town,
          postcode: defaultAddress.postcode,
          source: "saved",
          lat: null,
          lng: null,
        }
      : current,
  };
};

export const getInitialBooking = (stylist: Stylist): InitialBooking => {
  const params = getSearchParams();
  const serviceParam = params.get("service") || "";
  const service = serviceParam ? findService(stylist, serviceParam) : null;
  const fixture = params.get("fixture") || "";
  const board = !!fixture || params.get("board") === "true";
  const turnstile = params.get("turnstile");
  const today = new Date();

  const state: BookingState = {
    id: stylist.id,
    serviceId: service ? service.id : serviceParam,
    step: getStartStep(service),
    policyOpen: false,
    selection: getFreshSelection(service),
    showPrev: false,
    calendarMonth: today.getMonth(),
    calendarYear: today.getFullYear(),
    date: null,
    time: null,
    details: { ...EMPTY_DETAILS },
    photos: [],
    pay: {
      number: "",
      expiry: "",
      cvc: "",
      name: "",
      postcode: "",
      future: false,
    },
    // the signed-in person fills in once their profile loads (use-booking)
    loggedIn: false,
    guest: false,
    editContact: false,
    loginStart: null,
    board,
    holdSeconds: parseInt(params.get("hold") ?? "", 10) || DEFAULT_HOLD_SECONDS,
    hold: null,
    holding: false,
    holdError: null,
    holdExpired: false,
    taken: params.get("taken") === "1",
    appointmentAddress: { ...EMPTY_ADDRESS },
    legalDocument: null,
    leave: null,
    bank: false,
    wallet: null,
    payKind: "",
    account: {
      password: "",
      show: false,
      error: "",
      saved: false,
      hidden: false,
      sent: false,
      sentAt: 0,
    },
    resumeDraft: null,
    repickNote: false,
    turnstileMode:
      turnstile === "challenge" || turnstile === "fail" ? turnstile : null,
    turnstileStatus: "idle",
    paying: false,
    payError: "",
    confirmed: false,
    allergy: {
      on: false,
      text: "",
      prior: false,
      editing: false,
      focus: false,
    },
    saved: [],
    selectedAddressId: "new",
    sizeGuide: false,
  };

  // dev board of the saved-address cards (signed-in clients get theirs in use-booking)
  if (fixture === "saved-addr")
    Object.assign(state, getSavedAddressPatch(state.appointmentAddress));

  let openPrivacy = false;
  let showErrors = false;

  // demo states are dev-only; production builds drop this branch and the fixtures module
  if (import.meta.env.DEV && fixture)
    ({ openPrivacy, showErrors } = applyFixture(state, fixture, stylist));

  if (!state.board) {
    const draft = readDraft(state.id);

    if (draft) {
      if (params.get("resume") === "1")
        Object.assign(state, getDraftPatch(draft, state));
      else state.resumeDraft = draft;
    }
  }

  return { state, openPrivacy, showErrors };
};
