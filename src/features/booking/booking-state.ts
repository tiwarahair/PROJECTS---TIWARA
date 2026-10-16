// Booking state: the initial state (URL params, fixtures, saved addresses, draft resume) and the
// localStorage draft (tw_bk_draft_<stylist>, 24h).
import type { SavedAddress } from "../../types/address";
import type { Service } from "../../types/service";
import type { Stylist } from "../../types/stylist";
import { getSearchParams } from "../../utils/page-flags";
import { getSavedAddresses } from "../../utils/saved-addresses";
import { applyFixture } from "./booking-fixtures";
import { findService, hasStep2 } from "../../utils/services";

const DRAFT_TTL_MS = 864e5;
const DEFAULT_HOLD_SECONDS = 600;

export interface Selection {
  size: string | null;
  length: string | null;
  colour: string;
  own: Record<string, string | undefined>;
  addons: string[];
}

export interface Details {
  first: string;
  last: string;
  email: string;
  phone: string;
  notes: string;
}

export interface PayFields {
  number: string;
  expiry: string;
  cvc: string;
  name: string;
  postcode: string;
  future: boolean;
}

export interface BookingAddress {
  postcode: string;
  line1: string;
  line2: string;
  town: string;
  notes: string;
  source: string;
  /** Google's point for the address (picked from suggestions); null until known. */
  lat: number | null;
  lng: number | null;
}

/** The server's hold on the chosen time (dev boards fake one with empty id and secret). */
interface Hold {
  id: string;
  secret: string;
  until: number;
}

interface AccountSave {
  password: string;
  show: boolean;
  error: string;
  saved: boolean;
  hidden: boolean;
  sent: boolean;
  sentAt: number;
}

export interface AllergyState {
  on: boolean;
  text: string;
  prior: boolean;
  editing: boolean;
  focus: boolean;
}

interface Photo {
  name: string;
  url: string;
}

interface BookingDraft {
  at: number;
  step: number;
  serviceId: string;
  selection: Selection;
  calendarMonth: number;
  calendarYear: number;
  date: number | null;
  time: string | null;
  details: Omit<Details, "notes"> & { notes: string };
  appointmentAddress: BookingAddress;
  holdUntil: number | null;
  holdId?: string;
  holdSecret?: string;
  guest?: boolean;
}

export type FieldKey = "address" | "first" | "last" | "email" | "phone";
type LegalDocumentKind = "terms" | "privacy";
type TurnstileState = "idle" | "checking" | "passed" | "fail";

export interface BookingState {
  id: string;
  serviceId: string;
  step: number;
  policyOpen: boolean;
  selection: Selection;
  showPrev: boolean;
  calendarMonth: number;
  calendarYear: number;
  date: number | null;
  time: string | null;
  details: Details;
  photos: Photo[];
  pay: PayFields;
  loggedIn: boolean;
  guest: boolean;
  editContact: boolean;
  loginStart: "choice" | "email" | null;
  board: boolean;
  holdSeconds: number;
  hold: Hold | null;
  holding: boolean;
  /** Why the chosen time couldn't be held: taken by someone else, or anything else. */
  holdError: "taken" | "failed" | null;
  holdExpired: boolean;
  taken: boolean;
  appointmentAddress: BookingAddress;
  legalDocument: LegalDocumentKind | null;
  leave: string | null;
  bank: boolean;
  wallet: string | null;
  payKind: string;
  account: AccountSave;
  resumeDraft: BookingDraft | null;
  repickNote: boolean;
  turnstileMode: "challenge" | "fail" | null;
  turnstileStatus: TurnstileState;
  paying: boolean;
  payError: string;
  confirmed: boolean;
  allergy: AllergyState;
  saved: SavedAddress[];
  selectedAddressId: string;
  sizeGuide: boolean;
}

/** The demo customer (dev fixtures only). */
export const DEMO_DETAILS = {
  first: "Nia",
  last: "Okafor",
  email: "nia.okafor@gmail.com",
  phone: "07700 900123",
};

export const EMPTY_DETAILS: Details = {
  first: "",
  last: "",
  email: "",
  phone: "",
  notes: "",
};

export const EMPTY_ADDRESS: BookingAddress = {
  postcode: "",
  line1: "",
  line2: "",
  town: "",
  notes: "",
  source: "",
  lat: null,
  lng: null,
};

/** Default picks for a service: first option of each own customisation, colour 30 Auburn. */
export const getFreshSelection = (
  service: Service | null | undefined,
): Selection => {
  const own: Record<string, string | undefined> = {};

  for (const { name, options } of service?.ownCustomisations ?? [])
    own[name] = options[0]?.label;

  return { size: null, length: null, colour: "30 Auburn", own, addons: [] };
};

const getDraftKey = (stylistId: string): string => `tw_bk_draft_${stylistId}`;

const readDraft = (stylistId: string): BookingDraft | null => {
  try {
    const draft = JSON.parse(
      localStorage.getItem(getDraftKey(stylistId)) || "null",
    ) as BookingDraft | null;

    if (!draft || !draft.serviceId) return null;

    if (Date.now() - draft.at > DRAFT_TTL_MS) {
      localStorage.removeItem(getDraftKey(stylistId));

      return null;
    }

    return draft;
  } catch {
    return null;
  }
};

/** Saves the booking so far (no card, photos or allergy text); boards, no service or confirmed never save. */
export const saveDraft = (state: BookingState): void => {
  const { board, serviceId, confirmed, details, hold } = state;

  if (board || !serviceId || confirmed) return;

  const { first, last, email, phone, notes } = details;

  const draft: BookingDraft = {
    at: Date.now(),
    step: state.step,
    serviceId,
    selection: state.selection,
    calendarMonth: state.calendarMonth,
    calendarYear: state.calendarYear,
    date: state.date,
    time: state.time,
    details: { first, last, email, phone, notes },
    appointmentAddress: state.appointmentAddress,
    holdUntil: hold ? hold.until : null,
    holdId: hold?.id,
    holdSecret: hold?.secret,
    guest: state.guest,
  };

  try {
    localStorage.setItem(getDraftKey(state.id), JSON.stringify(draft));
  } catch {
    // storage unavailable
  }
};

export const clearDraft = (stylistId: string): void => {
  try {
    localStorage.removeItem(getDraftKey(stylistId));
  } catch {
    // storage unavailable
  }
};

/** Restores a draft; a past or released time sends the client back to Time ("Pick your time again"). */
export const getDraftPatch = (
  draft: BookingDraft,
  state: BookingState,
): Partial<BookingState> => {
  const now = Date.now();
  let past = false;

  if (draft.date && draft.time) {
    const [hours = 0, minutes = 0] = draft.time.split(":").map(Number);

    past =
      new Date(
        draft.calendarYear,
        draft.calendarMonth,
        draft.date,
        hours,
        minutes,
      ).getTime() < now;
  }

  const holdOk = !!(draft.holdUntil && draft.holdUntil > now);

  const patch: Partial<BookingState> = {
    serviceId: draft.serviceId,
    selection: draft.selection,
    step: draft.step,
    calendarMonth: draft.calendarMonth,
    calendarYear: draft.calendarYear,
    date: draft.date,
    time: draft.time,
    details: { ...state.details, ...draft.details },
    guest: draft.guest ?? !!(draft.details.first || draft.details.email),
    appointmentAddress: {
      ...state.appointmentAddress,
      ...draft.appointmentAddress,
    },
    hold:
      holdOk && draft.holdUntil
        ? {
            id: draft.holdId ?? "",
            secret: draft.holdSecret ?? "",
            until: draft.holdUntil,
          }
        : null,
    resumeDraft: null,
    repickNote: false,
  };

  if (draft.time && (past || !holdOk)) {
    Object.assign(patch, {
      step: Math.min(draft.step, 3),
      time: null,
      hold: null,
      repickNote: draft.step >= 3,
    });

    if (past) patch.date = null;
  }

  return patch;
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
