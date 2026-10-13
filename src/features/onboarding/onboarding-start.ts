// Where the onboarding page starts: screen, saved wizard progress, fixtures, return URL and theme.
import type { Location } from "react-router";
import { MODE_KEY, STORAGE_KEY } from "./onboarding-data";
import { getFixturePatch } from "./onboarding-fixtures";
import { getRouteForPath, ROUTE_START } from "./onboarding-routes";
import type { OnboardingRoute } from "./onboarding-routes";
import { INITIAL_FORM, INITIAL_STATE } from "./onboarding-state";
import type {
  OnboardingForm,
  ResolvedProps,
  StartState,
} from "./onboarding-state";

interface SavedProgress {
  form?: Partial<OnboardingForm>;
  addressOpen?: boolean;
  pinLatLng?: [number, number] | null;
  geocodedLatLng?: [number, number] | null;
  area?: string | null;
}

export const readStorage = (storage: Storage, key: string): string | null => {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
};

/** Where to send customers after log in: ?return=, sessionStorage tw_return, a same-origin referrer, else Home. */
const getReturnTo = (search: string): string => {
  let returnTo =
    new URLSearchParams(search).get("return") ||
    readStorage(sessionStorage, "tw_return");

  if (!returnTo) {
    try {
      const referrer = document.referrer ? new URL(document.referrer) : null;

      if (
        referrer &&
        referrer.origin === window.location.origin &&
        !/onboarding|^\/(login|signup|join)$/i.test(
          decodeURIComponent(referrer.pathname),
        )
      )
        returnTo = referrer.pathname + referrer.search;
    } catch {
      // unreadable referrer
    }
  }

  return returnTo || "/";
};

/** A ?flow= / handed-off flow wins, then an explicit screen prop, then the route's own start. */
const getStartScreen = (
  flow: string | null,
  { screen }: ResolvedProps,
  route: OnboardingRoute,
) => {
  if (flow === "list") return "welcome";

  if (flow === "pro") return "pro-email";

  if (flow === "reset") return "forgot-reset";

  // back from Google: wait on the chooser while the account is checked
  if (flow === "social" || flow === "social-pro") return "chooser";

  if (screen && screen !== "auto") return screen;

  return ROUTE_START[route];
};

/** The theme prop wins, then the stored mode, then the system preference. */
const getStartMode = (
  { theme }: ResolvedProps,
  storedMode: string | null,
  prefersDark: boolean,
) => {
  if (theme && theme !== "auto") return theme;

  if (storedMode === "dark" || storedMode === "light") return storedMode;

  return prefersDark ? "dark" : "light";
};

/** The initial state, computed up front (start screen, saved progress, board, fixture, mode). */
export const getStartState = (
  props: ResolvedProps,
  { pathname, search }: Pick<Location, "pathname" | "search">,
): StartState => {
  const state: StartState = {
    ...INITIAL_STATE,
    form: INITIAL_FORM,
    touched: {},
    flow: null,
    width: document.documentElement.clientWidth,
  };

  let saved: SavedProgress | null = null;

  try {
    saved = JSON.parse(
      readStorage(localStorage, STORAGE_KEY) || "null",
    ) as SavedProgress | null;
  } catch {
    // unreadable progress: start fresh
  }

  const handoff = readStorage(sessionStorage, "tw_flow");

  try {
    sessionStorage.removeItem("tw_flow");
  } catch {
    // storage unavailable
  }

  const flow = new URLSearchParams(search).get("flow") || handoff;
  const route = getRouteForPath(pathname) ?? "login";
  const start = getStartScreen(flow, props, route);

  state.screen = start;
  state.flow = flow;
  state.returnTo = getReturnTo(search);

  if (start === "welcome" || start[0] === "w") state.audience = "pro";

  if (saved && saved.form && !props.board) {
    state.form = {
      ...state.form,
      ...saved.form,
      password: "",
      passwordConfirm: "",
      terms: false,
    };

    if (saved.addressOpen) state.addressOpen = true;

    if (saved.pinLatLng) state.pinLatLng = saved.pinLatLng;

    if (saved.geocodedLatLng) state.geocodedLatLng = saved.geocodedLatLng;

    if (saved.area) state.area = saved.area;
  }

  if (props.board) {
    const isPro = /^(pro-|w)/.test(start);

    state.form = {
      ...state.form,
      ...(isPro
        ? { email: "amara@tiwarashouse.co.uk", first: "Amara", last: "Okonkwo" }
        : { email: "ama@example.com", first: "Ama", last: "Mensah" }),
    };

    if (isPro) state.audience = "pro";
    else if (start !== "welcome" && start !== "chooser")
      state.audience = "customer";
  }

  // fixtures start from the blank form, not the saved / board one
  // demo states are dev-only; production builds drop this branch and the fixtures module
  if (import.meta.env.DEV && props.fixture && props.fixture !== "none")
    Object.assign(state, getFixturePatch(props.fixture, INITIAL_FORM));

  const storedMode = readStorage(localStorage, MODE_KEY);

  const prefersDark =
    !!window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  state.mode = getStartMode(props, storedMode, prefersDark);

  return state;
};
