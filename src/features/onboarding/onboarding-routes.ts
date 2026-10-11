// Which onboarding screens live on which route: /login, /signup (customers) and /join (stylists).

export type OnboardingRoute = "login" | "signup" | "join";

/** Where a fresh visit to each route starts. */
export const ROUTE_START: Record<OnboardingRoute, string> = {
  login: "chooser",
  signup: "cust-email",
  join: "welcome",
};

const SIGNUP_SCREENS = ["cust-create", "cust-social"];
const JOIN_SCREENS = ["welcome", "w1", "w2", "w3", "w4", "w5"];
/** Reached from more than one route, so they stay on whichever route they're on. */
const SHARED_SCREENS = ["cust-email", "verify", "studio"];

/** The route a screen opens on from elsewhere; anything not listed is on /login. */
const getScreenRoute = (screen: string): OnboardingRoute =>
  SIGNUP_SCREENS.includes(screen)
    ? "signup"
    : JOIN_SCREENS.includes(screen)
      ? "join"
      : "login";

export const getRouteForPath = (pathname: string): OnboardingRoute | null => {
  const route = pathname.slice(1);

  return route in ROUTE_START ? (route as OnboardingRoute) : null;
};

export const isScreenOnRoute = (screen: string, route: OnboardingRoute) =>
  SHARED_SCREENS.includes(screen) || getScreenRoute(screen) === route;

/** The path a screen opens on from elsewhere, e.g. "/signup" for cust-create. */
export const getScreenPath = (screen: string) => "/" + getScreenRoute(screen);
