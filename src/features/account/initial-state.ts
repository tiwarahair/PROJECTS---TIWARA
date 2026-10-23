import { getSavedAddresses } from "../../utils/saved-addresses";
import { LEGACY_TABS, SECTION_IDS } from "./data";
import { EMPTY_CODE, EMPTY_PROFILE, WIDE_PX } from "./state";
import type { AccountProps, AccountState } from "./state";

/** ?section= (or legacy ?tab=), else the prop; only real sections. */
export const readSection = (
  params: URLSearchParams,
  propSection?: string,
): string | null => {
  let section = params.get("section") || params.get("tab") || propSection || "";

  section = LEGACY_TABS[section] || section;

  return SECTION_IDS.includes(section) ? section : null;
};

/** A real account starts empty and fills in from the signed-in profile. */
export const getInitialState = (
  { section }: AccountProps,
  params: URLSearchParams,
): AccountState => ({
  sectionId: readSection(params, section),
  wide: window.innerWidth >= WIDE_PX,
  dialog: null,
  toast: "",
  bookings: [],
  entries: [],
  allergyEdit: -1,
  allergyDraft: "",
  profile: EMPTY_PROFILE,
  photo: null,
  photoError: "",
  quiz: false,
  edit: null,
  emailStep: "",
  code: EMPTY_CODE,
  codeError: "",
  shake: 0,
  resendIn: 0,
  password: { has: true, open: false, show: false },
  googleConnected: false,
  appleConnected: false,
  cards: [],
  addresses: getSavedAddresses(),
  addressForm: null,
  marketing: false,
  sync: "k7f2m9qx",
  cookies: { analytics: false, marketing: false },
  cookiesDraft: { analytics: false, marketing: false },
  deleteText: "",
  loggedOut: false,
  deleted: false,
});
