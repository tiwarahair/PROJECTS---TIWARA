import { getSavedAddresses } from "../../utils/saved-addresses";
import {
  DEMO_PHOTO,
  getSeedBookings,
  LEGACY_TABS,
  SEED_PROFILE,
  SECTION_IDS,
  SEED_CARDS,
  SHARED_ENTRIES,
} from "./data";
import { applyFixture } from "./fixtures";
import type { FixtureForms } from "./fixtures";
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

/** Demo data only on dev boards; a real account starts empty and fills in from the profile. */
export const isDemoAccount = (params: URLSearchParams, fixture: string) =>
  import.meta.env.DEV && (!!fixture || params.get("board") === "true");

export const getInitialState = (
  {
    section,
    fixture: propFixture,
    hairQuiz = true,
    photo = false,
    marketing = false,
  }: AccountProps,
  params: URLSearchParams,
): { state: AccountState; fixtureForms: FixtureForms } => {
  const fixture = params.get("fixture") || propFixture || "";
  const isDemo = isDemoAccount(params, fixture);

  const flag = (key: string, fallback: boolean) =>
    params.has(key) ? params.get(key) === "1" : fallback;

  const state: AccountState = {
    fixture,
    sectionId: readSection(params, section),
    wide: window.innerWidth >= WIDE_PX,
    dialog: null,
    toast: "",
    bookings: isDemo ? getSeedBookings(fixture) : [],
    entries: isDemo ? SHARED_ENTRIES.map((entry) => ({ ...entry })) : [],
    allergyEdit: -1,
    allergyDraft: "",
    profile: isDemo ? SEED_PROFILE : EMPTY_PROFILE,
    photo: isDemo && flag("photo", photo) ? DEMO_PHOTO : null,
    photoError: "",
    quiz: isDemo && flag("quiz", hairQuiz),
    edit: null,
    emailStep: "",
    code: EMPTY_CODE,
    codeError: "",
    shake: 0,
    resendIn: 0,
    password: { has: true, open: false, show: false },
    googleConnected: isDemo,
    appleConnected: false,
    cards: isDemo ? SEED_CARDS.map((card) => ({ ...card })) : [],
    addresses: getSavedAddresses(params.toString()),
    addressForm: null,
    marketing: flag("mkt", marketing),
    sync: "k7f2m9qx",
    cookies: { analytics: false, marketing: false },
    cookiesDraft: { analytics: false, marketing: false },
    deleteText: "",
    loggedOut: false,
    deleted: false,
  };

  // demo states are dev-only; production builds drop this branch and the fixtures module
  const fixtureForms =
    import.meta.env.DEV && fixture ? applyFixture(state, fixture) : {};

  const fromUrl = readSection(params, section);

  if (fromUrl) state.sectionId = fromUrl;

  return { state, fixtureForms };
};
