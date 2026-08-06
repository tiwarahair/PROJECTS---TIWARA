import { describe, expect, it } from "vitest";
import { matchPath } from "react-router";
import {
  bookingPath,
  PATH,
  profilePath,
  RESERVED_SLUGS,
  ROUTES,
  searchPath,
  STEP_SLUG,
  stepFromSlug,
  type SurfaceId,
} from "./routes";
import { BOOKING_STEP } from "../types/booking";
import { findStylistBySlug, STYLISTS } from "../data/stylist/stylist";

/** Mirrors how useRouteSurfaces resolves a path: first entry wins. */
const surfaceFor = (pathname: string): SurfaceId | undefined =>
  ROUTES.find(({ path }) => matchPath(path, pathname))?.surface;

describe("route matching", () => {
  it.each([
    [PATH.search, "search"],
    [PATH.hairQuiz, "hairQuiz"],
    [PATH.forStylists, "stylists"],
    [PATH.shop, "shop"],
    [PATH.about, "about"],
    [PATH.styleDiscovery, "aiDiscovery"],
    [PATH.book, "booking"],
    ["/book/customise", "booking"],
    ["/tiwaras-house", "profile"],
  ])("maps %s to the %s surface", (pathname, surface) => {
    expect(surfaceFor(pathname)).toBe(surface);
  });

  it("matches nothing on the landing route", () => {
    expect(surfaceFor(PATH.home)).toBeUndefined();
  });

  // `/:stylistSlug` is matched with a plain .find(), so its position in the
  // table is what stops it swallowing every other single-segment path.
  it("keeps the catch-all profile route last", () => {
    expect(ROUTES.at(-1)?.surface).toBe("profile");
  });

  it("gives every static route a slug that is reserved", () => {
    const dynamic = ROUTES.filter(({ path }) => !path.includes(":"));
    for (const { path } of dynamic) {
      expect(RESERVED_SLUGS.has(path.slice(1))).toBe(true);
    }
  });
});

describe("stylist slugs", () => {
  it("resolves each stylist by their slug", () => {
    for (const stylist of STYLISTS) {
      expect(findStylistBySlug(stylist.slug)).toBe(stylist);
    }
  });

  it("gives every stylist a unique slug", () => {
    const slugs = STYLISTS.map(({ slug }) => slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("never lets a stylist claim a reserved path", () => {
    for (const { slug } of STYLISTS) {
      expect(RESERVED_SLUGS.has(slug)).toBe(false);
    }
    // Even if one slipped into the data, resolution refuses it.
    expect(findStylistBySlug("shop")).toBeUndefined();
  });

  it("returns nothing for an unknown or empty slug", () => {
    expect(findStylistBySlug("tiwaras-hous")).toBeUndefined();
    expect(findStylistBySlug(undefined)).toBeUndefined();
    expect(findStylistBySlug("")).toBeUndefined();
  });
});

describe("booking step slugs", () => {
  it("round-trips every step", () => {
    for (const step of Object.values(BOOKING_STEP)) {
      expect(stepFromSlug(STEP_SLUG[step])).toBe(step);
    }
  });

  it("gives every step a distinct slug", () => {
    const slugs = Object.values(STEP_SLUG);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("rejects an unknown or missing slug", () => {
    expect(stepFromSlug("nonsense")).toBeUndefined();
    expect(stepFromSlug(undefined)).toBeUndefined();
  });
});

describe("path builders", () => {
  it("omits empty search filters", () => {
    expect(searchPath()).toBe("/search");
    expect(searchPath({ style: "" })).toBe("/search");
    expect(searchPath({ style: "braids" })).toBe("/search?style=braids");
    expect(searchPath({ style: "braids", location: "Leeds" })).toBe(
      "/search?style=braids&location=Leeds",
    );
  });

  it("builds booking paths with only the context that is set", () => {
    expect(bookingPath(BOOKING_STEP.service)).toBe("/book/service");
    expect(bookingPath(BOOKING_STEP.style)).toBe("/book/style");
    expect(bookingPath(BOOKING_STEP.review, { service: "locs" })).toBe(
      "/book/review?service=locs",
    );
    expect(
      bookingPath(BOOKING_STEP.customise, {
        service: "braids",
        stylist: "tiwaras-house",
      }),
    ).toBe("/book/customise?service=braids&stylist=tiwaras-house");
  });

  // A profile service row settles the style as well as the service.
  it("carries a pre-picked style through to the booking", () => {
    expect(
      bookingPath(BOOKING_STEP.customise, {
        service: "braids",
        style: "knotless",
        stylist: "tiwaras-house",
      }),
    ).toBe(
      "/book/customise?service=braids&style=knotless&stylist=tiwaras-house",
    );
  });

  it("builds profile paths that match the profile route", () => {
    expect(profilePath("tiwaras-house")).toBe("/tiwaras-house");
    expect(surfaceFor(profilePath("amara-beauty"))).toBe("profile");
  });
});
