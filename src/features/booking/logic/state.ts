import type { Service } from "../../../types/service";
import type { Stylist } from "../../../types/stylist";
import { getSearchParams } from "../../../utils/page-flags";
import { getSavedAddresses } from "../../../utils/saved-addresses";
import { findService, hasStep2 } from "../../../utils/services";
import { EMPTY_ADDRESS, EMPTY_DETAILS } from "./constants";
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

/** Skip straight past steps the preselected service doesn't need. */
export const getStartStep = (service: Service | null): number => {
  if (!service) return 1;

  return hasStep2(service) ? 2 : 3;
};

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

export const getInitialBooking = (stylist: Stylist): BookingState => {
  const params = getSearchParams();
  const serviceParam = params.get("service") || "";
  const service = serviceParam ? findService(stylist, serviceParam) : null;
  const today = new Date();

  const state: BookingState = {
    id: stylist.id,
    serviceId: service ? service.id : serviceParam,
    step: getStartStep(service),
    selection: getFreshSelection(service),
    showPrev: false,
    calendarMonth: today.getMonth(),
    calendarYear: today.getFullYear(),
    date: null,
    time: null,
    details: { ...EMPTY_DETAILS },
    photos: [],
    keepCard: false,
    loggedIn: false,
    guest: false,
    editContact: false,
    loginStart: null,
    hold: null,
    holding: false,
    holdError: null,
    holdExpired: false,
    appointmentAddress: { ...EMPTY_ADDRESS },
    legalDocument: null,
    leave: null,
    payKind: "",
    account: {
      saved: false,
      hidden: false,
      sent: false,
      sentAt: 0,
    },
    resumeDraft: null,
    repickNote: false,
    paying: false,
    confirming: false,
    booked: null,
    payError: "",
    confirmed: false,
    allergy: {
      on: false,
      text: "",
      prior: false,
      focus: false,
    },
    saved: [],
    selectedAddressId: "new",
    sizeGuide: false,
  };

  const draft = readDraft(state.id);

  if (draft) {
    if (params.get("resume") === "1")
      Object.assign(state, getDraftPatch(draft, state));
    else state.resumeDraft = draft;
  }

  return state;
};
