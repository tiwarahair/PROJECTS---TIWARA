// Booking state: the initial state (URL params, fixtures, saved addresses, draft resume) and the
// localStorage draft (tw_bk_draft_<stylist>, 24h).
import { stylists } from "../../data";
import type { SavedAddress } from "../../types/address";
import type { Service } from "../../types/service";
import type { Stylist } from "../../types/stylist";
import { getSearchParams } from "../../utils/page-flags";
import { getSavedAddresses } from "../../utils/saved-addresses";
import {
  findService,
  getActiveServices,
  getServiceOptions,
  hasStep2,
} from "../../utils/services";

export const DEFAULT_STYLIST_ID = "tiwaras-house";
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
}

export interface Hold {
  key: string;
  until: number;
}

export interface AccountSave {
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

export interface Photo {
  name: string;
  url: string;
}

export interface BookingDraft {
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
  holdKey?: string | null;
}

export type FieldKey = "address" | "first" | "last" | "email" | "phone";
export type LegalDocumentKind = "terms" | "privacy";
export type TurnstileState = "idle" | "checking" | "passed" | "fail";

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
  board: boolean;
  holdSeconds: number;
  hold: Hold | null;
  holdExpired: boolean;
  taken: boolean;
  touched: Partial<Record<FieldKey, boolean>>;
  showErrors: boolean;
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
  agreed: { cancel: boolean; deposit: boolean };
  confirmed: boolean;
  allergy: AllergyState;
  saved: SavedAddress[];
  selectedAddressId: string;
  sizeGuide: boolean;
}

/** The demo customer. */
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
};

export const getStylist = (id: string): Stylist => {
  const stylist = stylists.find((item) => item.id === id) ?? stylists[0];

  if (!stylist) throw new Error("No stylists in the seed data");

  return stylist;
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

export const getHoldKey = (
  year: number,
  month: number,
  day: number | null,
  time: string,
): string => `${year}-${month}-${day} ${time}`;

export const getDraftKey = (stylistId: string): string =>
  `tw_bk_draft_${stylistId}`;

export const readDraft = (stylistId: string): BookingDraft | null => {
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
    holdKey: hold ? hold.key : null,
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
    appointmentAddress: {
      ...state.appointmentAddress,
      ...draft.appointmentAddress,
    },
    hold:
      holdOk && draft.holdUntil
        ? { key: draft.holdKey ?? "", until: draft.holdUntil }
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

const readLoggedIn = (params: URLSearchParams, board: boolean): boolean => {
  let loggedIn = params.get("login") === "1";

  try {
    if (!board) {
      if (loggedIn) sessionStorage.setItem("tw_cust", "1");
      else loggedIn = sessionStorage.getItem("tw_cust") === "1";
    }
  } catch {
    // storage unavailable
  }

  return loggedIn;
};

/** Next week's Wednesday: the demo date every fixture books. */
const getFixtureDate = (): Date => {
  const date = new Date();

  date.setDate(date.getDate() + ((10 - date.getDay()) % 7 || 7));

  return date;
};

const pickLabel = (
  options: { label: string }[],
  label: string,
): string | null =>
  options.length
    ? ((options.find((option) => option.label === label) ?? options[0])
        ?.label ?? null)
    : null;

/** ?fixture= board states. */
const applyFixture = (
  state: BookingState,
  fixture: string,
  defaultStylist: Stylist,
): { openPrivacy: boolean } => {
  const fixtureDate = getFixtureDate();

  const setFixtureDate = () => {
    state.calendarMonth = fixtureDate.getMonth();
    state.calendarYear = fixtureDate.getFullYear();
    state.date = fixtureDate.getDate();
    state.time = "10:30";
  };

  if (!state.serviceId) {
    const service =
      findService(defaultStylist, "Knotless braids") ??
      getActiveServices(defaultStylist)[0];

    state.serviceId = service ? service.id : "";
    state.selection = getFreshSelection(service);
  }

  if (state.selection.size === null) {
    const options = getServiceOptions(
      findService(defaultStylist, state.serviceId),
    );

    state.selection.size = pickLabel(options.size, "Medium");
    state.selection.length = pickLabel(options.length, "Shoulder");
  }

  state.details = { ...DEMO_DETAILS, notes: "" };
  state.step = 4;

  if (fixture === "details-empty") state.allergy.on = true;

  if (["details-text", "review", "privacy"].includes(fixture))
    Object.assign(state.allergy, { on: true, text: "Sensitive scalp" });

  if (fixture === "details-text")
    state.allergy.text =
      "Sensitive scalp, and I react to strong-hold edge control. Please use something fragrance-free.";

  if (fixture === "details-prefill")
    Object.assign(state.allergy, {
      on: true,
      text: "Sensitive scalp",
      prior: true,
    });

  if (fixture === "natural") {
    const natural = getStylist("naturallynia");
    const service = findService(natural, "Wash & style");

    state.id = natural.id;
    state.serviceId = service?.id ?? "";
    state.selection = getFreshSelection(service);
    state.step = 3;
  }

  if (fixture === "custom-before" || fixture === "custom-after") {
    state.step = 2;
    const service = findService(defaultStylist, state.serviceId);

    state.selection = getFreshSelection(service);

    if (fixture === "custom-after") {
      const { size, length } = getServiceOptions(service);

      state.selection.size = size.find(({ label }) => label === "Medium")
        ? "Medium"
        : (size[0]?.label ?? null);

      state.selection.length = length.find(({ label }) => label === "Bra")
        ? "Bra"
        : (length[0]?.label ?? null);
    }
  }

  if (fixture === "email-typo") state.details.email = "nia.okafor@gmial.com";

  if (["pay", "turnstile", "confirm"].includes(fixture)) {
    state.step = 6;
    setFixtureDate();
  }

  if (fixture === "turnstile" && !state.turnstileMode)
    state.turnstileMode = "challenge";

  if (fixture === "confirm") state.confirmed = true;

  if (fixture === "review") {
    state.step = 5;
    setFixtureDate();
  }

  const fixtureStylist =
    stylists.find(({ id }) => id === state.id) ?? defaultStylist;

  const isMobileStylist = fixtureStylist.businessType === "mobile";

  if (["address", "address-out", "address-empty"].includes(fixture))
    state.step = 4;

  if (state.step >= 4 && !state.date) setFixtureDate();

  if (
    isMobileStylist &&
    !["details-errors", "address-empty", "address-out"].includes(fixture)
  )
    state.appointmentAddress = {
      ...state.appointmentAddress,
      postcode: "M14 5TQ",
      line1: "12 Dickenson Road",
      line2: "",
      town: "Manchester",
      source: "pick",
    };

  if (fixture === "address-out")
    state.appointmentAddress = {
      ...state.appointmentAddress,
      postcode: "BL1 4QR",
      line1: "12 Chorley New Road",
      line2: "",
      town: "Bolton",
      source: "pick",
    };

  if (fixture === "details-errors") {
    state.details = { ...EMPTY_DETAILS };
    state.showErrors = true;
  }

  if (
    [
      "pay-declined",
      "pay-bank",
      "pay-bankfail",
      "pay-network",
      "pay-taken",
    ].includes(fixture)
  )
    state.step = 6;

  if (fixture === "pay-declined")
    Object.assign(state, {
      payError: "Your card was declined. Try another card or payment method.",
      payKind: "declined",
    });

  if (fixture === "pay-bank") state.bank = true;

  if (fixture === "pay-bankfail")
    Object.assign(state, {
      payError:
        "We couldn't confirm this payment with your bank. Try again or use another card.",
      payKind: "bank",
    });

  if (fixture === "pay-network")
    Object.assign(state, {
      payError: "Something went wrong and you haven't been charged. Try again.",
      payKind: "network",
    });

  if (fixture === "pay-taken")
    Object.assign(state, {
      payError: `Sorry, ${state.time} was just booked by someone else. You haven't been charged.`,
      payKind: "taken",
    });

  if (fixture === "confirm-saved") {
    state.confirmed = true;
    state.account = { ...state.account, saved: true };
  }

  if (fixture === "confirm-sent") {
    state.confirmed = true;
    state.account = { ...state.account, sent: true, sentAt: Date.now() };
  }

  if (state.step >= 4 && !state.confirmed && state.time)
    state.hold = {
      key: getHoldKey(
        state.calendarYear,
        state.calendarMonth,
        state.date,
        state.time,
      ),
      // hold-amber starts with 95 seconds left
      until:
        Date.now() +
        (fixture === "hold-amber" ? 95000 : state.holdSeconds * 1000),
    };

  if (fixture === "hold-expired") state.holdExpired = true;

  if (fixture === "leave") state.leave = `/stylist?stylist=${state.id}`;

  if (fixture === "time") {
    state.step = 3;
    state.date = null;
    state.time = null;
    state.hold = null;
  }

  if (fixture === "resume") {
    state.resumeDraft = {
      at: Date.now(),
      step: 5,
      serviceId: state.serviceId,
      selection: state.selection,
      calendarMonth: state.calendarMonth,
      calendarYear: state.calendarYear,
      date: state.date,
      time: state.time,
      details: { ...state.details },
      appointmentAddress: { ...state.appointmentAddress },
      holdUntil: null,
    };

    Object.assign(state, {
      step: 1,
      serviceId: "",
      selection: getFreshSelection(null),
      date: null,
      time: null,
      hold: null,
      details: { ...EMPTY_DETAILS },
    });
  }

  return { openPrivacy: fixture === "privacy" };
};

export interface InitialBooking {
  state: BookingState;
  /** ?fixture=privacy opens the allergy field's privacy sheet. */
  openPrivacy: boolean;
}

/** Skip straight past steps the preselected service doesn't need. */
const getStartStep = (service: Service | null): number => {
  if (!service) return 1;

  return hasStep2(service) ? 2 : 3;
};

export const getInitialBooking = (): InitialBooking => {
  const params = getSearchParams();
  const serviceParam = params.get("service") || "";
  const stylistId = params.get("stylist") || DEFAULT_STYLIST_ID;
  const defaultStylist = getStylist(stylistId);

  const service = serviceParam
    ? findService(defaultStylist, serviceParam)
    : null;

  const fixture = params.get("fixture") || "";
  const board = !!fixture || params.get("board") === "true";
  const loggedIn = readLoggedIn(params, board);
  const turnstile = params.get("turnstile");
  const today = new Date();

  const state: BookingState = {
    id: stylistId,
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
    loggedIn,
    board,
    holdSeconds: parseInt(params.get("hold") ?? "", 10) || DEFAULT_HOLD_SECONDS,
    hold: null,
    holdExpired: false,
    taken: params.get("taken") === "1",
    touched: {},
    showErrors: false,
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
    agreed: { cancel: false, deposit: false },
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

  // logged-in clients get their saved addresses, the default one preselected
  const saved =
    loggedIn && (!fixture || fixture === "saved-addr")
      ? getSavedAddresses()
      : [];

  const defaultAddress = saved.find(({ isDefault }) => isDefault) ?? saved[0];

  state.saved = saved;
  state.selectedAddressId = defaultAddress ? defaultAddress.id : "new";

  if (defaultAddress)
    state.appointmentAddress = {
      ...state.appointmentAddress,
      line1: defaultAddress.line1,
      line2: defaultAddress.line2 || "",
      town: defaultAddress.town,
      postcode: defaultAddress.postcode,
      source: "saved",
    };

  let openPrivacy = false;

  if (fixture) ({ openPrivacy } = applyFixture(state, fixture, defaultStylist));

  if (!state.board) {
    const draft = readDraft(state.id);

    if (draft) {
      if (params.get("resume") === "1")
        Object.assign(state, getDraftPatch(draft, state));
      else state.resumeDraft = draft;
    }
  }

  if (state.loggedIn) state.details = { ...state.details, ...DEMO_DETAILS };

  return { state, openPrivacy };
};
