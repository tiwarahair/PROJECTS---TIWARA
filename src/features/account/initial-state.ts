import { LEGACY_TABS, SECTION_IDS } from "./data";
import { EMPTY_CODES, EMPTY_PROFILE, WIDE_PX } from "./state";
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
  allergyEdit: -1,
  allergyDraft: "",
  allergyConsent: false,
  profile: EMPTY_PROFILE,
  photoError: "",
  quiz: false,
  edit: null,
  emailStep: "",
  codes: EMPTY_CODES,
  resendIn: 0,
  password: {
    has: true,
    open: false,
    show: false,
    isCodeSent: false,
    signOthers: false,
  },
  googleConnected: false,
  appleConnected: false,
  addressForm: null,
  marketing: false,
  cookies: { analytics: false, marketing: false },
  cookiesDraft: { analytics: false, marketing: false },
  deleteText: "",
  loggedOut: false,
  deleted: false,
});
