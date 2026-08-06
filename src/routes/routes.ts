import { matchPath } from "react-router";
import type { BookingStepIndex } from "../types/booking";
import { BOOKING_STEP } from "../types/booking";

export type SurfaceKind = "page" | "overlay";

/** A surface is anything the URL can put on screen, other than the landing. */
export type SurfaceId =
  | "search"
  | "profile"
  | "booking"
  | "aiDiscovery"
  | "hairQuiz"
  | "about"
  | "stylists"
  | "shop";

export const PATH = {
  home: "/",
  search: "/search",
  hairQuiz: "/hair-quiz",
  forStylists: "/for-stylists",
  shop: "/shop",
  about: "/about-us",
  styleDiscovery: "/style-discovery",
  book: "/book",
} as const;

export interface RouteEntry {
  path: string;
  surface: SurfaceId;
  kind: SurfaceKind;
  /** Shown in the tab title, appended to the brand (Tiwaras House). */
  title: string;
}

/**
 * Order is load-bearing: these are matched with a plain `.find()`, not React
 * Router's ranking, so `/:stylistSlug` must stay last or it would swallow
 * every single-segment path.
 */
export const ROUTES: readonly RouteEntry[] = [
  {
    path: PATH.search,
    surface: "search",
    kind: "page",
    title: "Find a Stylist",
  },
  {
    path: PATH.hairQuiz,
    surface: "hairQuiz",
    kind: "overlay",
    title: "Hair Quiz",
  },
  {
    path: PATH.forStylists,
    surface: "stylists",
    kind: "page",
    title: "For Stylists",
  },
  { path: PATH.shop, surface: "shop", kind: "page", title: "Shop" },
  { path: PATH.about, surface: "about", kind: "page", title: "About Us" },
  {
    path: PATH.styleDiscovery,
    surface: "aiDiscovery",
    kind: "overlay",
    title: "Style Discovery",
  },
  // Bare `/book` is a valid entry point; the overlay redirects it to the
  // first step rather than letting it fall through to the 404.
  { path: PATH.book, surface: "booking", kind: "overlay", title: "Book" },
  {
    path: `${PATH.book}/:step`,
    surface: "booking",
    kind: "overlay",
    title: "Book",
  },
  { path: "/:stylistSlug", surface: "profile", kind: "page", title: "Stylist" },
];

const getRoute = (pathname: string) =>
  ROUTES.find(({ path }) => matchPath(path, pathname));

export const getSurface = (pathname: string) => getRoute(pathname)?.surface;

/**
 * The landing route and any unknown path are treated as pages
 */
export const getSurfaceKind = (pathname: string): SurfaceKind =>
  getRoute(pathname)?.kind ?? "page";

export const getTitle = (pathname: string) => getRoute(pathname)?.title;

/**
 * Stylist profiles sit at the root, so a stylist must never be able to claim a
 * path the app already owns. Checked when resolving a slug, not when matching:
 * React Router already prefers the static route, so without this guard a
 * stylist slugged "shop" would simply become unreachable rather than noisy.
 */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  "search",
  "hair-quiz",
  "for-stylists",
  "shop",
  "about-us",
  "style-discovery",
  "book",
  // Not routed yet, but linked from the footer and reserved ahead of use.
  "privacy",
  "terms",
  "cancellation",
  "stylist-terms",
  "cookies",
  "contact",
  "admin",
  "api",
]);

/** URL segment for each booking step, in step order. */
export const STEP_SLUG: Record<BookingStepIndex, string> = {
  [BOOKING_STEP.service]: "service",
  [BOOKING_STEP.style]: "style",
  [BOOKING_STEP.whenWhere]: "when-where",
  [BOOKING_STEP.stylist]: "stylist",
  [BOOKING_STEP.customise]: "customise",
  [BOOKING_STEP.schedule]: "date-time",
  [BOOKING_STEP.details]: "details",
  [BOOKING_STEP.review]: "review",
  [BOOKING_STEP.confirm]: "confirmation",
};

const STEP_BY_SLUG = new Map<string, BookingStepIndex>(
  Object.entries(STEP_SLUG).map(([step, slug]) => [
    slug,
    Number(step) as BookingStepIndex,
  ]),
);

export const stepFromSlug = (slug: string | undefined) =>
  slug === undefined ? undefined : STEP_BY_SLUG.get(slug);

/**
 * Reads the step straight from the path. The booking overlay is not rendered
 * inside a <Route> — surfaces stay mounted so their transitions survive — so
 * there is no route match for `useParams` to read.
 */
export const stepFromPath = (pathname: string) =>
  stepFromSlug(matchPath(`${PATH.book}/:step`, pathname)?.params.step);

export interface BookingQuery {
  /** Which service is being booked; absent means the client picks one. */
  service?: string;
  /** A style the entry point already settled, e.g. a profile's service row. */
  style?: string;
  /** Stylist slug. Its presence is what drops the when & where and picker steps. */
  stylist?: string;
}

/** Builds `/book/<step>?service=…&style=…&stylist=…`. Never carries form values. */
export const bookingPath = (
  step: BookingStepIndex,
  { service, style, stylist }: BookingQuery = {},
) => {
  const params = new URLSearchParams();
  if (service) params.set("service", service);
  if (style) params.set("style", style);
  if (stylist) params.set("stylist", stylist);
  const query = params.toString();
  return `${PATH.book}/${STEP_SLUG[step]}${query ? `?${query}` : ""}`;
};

export interface SearchQuery {
  style?: string;
  location?: string;
}

/** Builds `/search?style=…&location=…`, omitting empty values. */
export const searchPath = ({ style, location }: SearchQuery = {}) => {
  const params = new URLSearchParams();
  if (style) params.set("style", style);
  if (location) params.set("location", location);
  const query = params.toString();
  return query ? `${PATH.search}?${query}` : PATH.search;
};

export const profilePath = (slug: string) => `/${slug}`;
