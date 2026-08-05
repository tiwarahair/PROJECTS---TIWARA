import { useLocation, matchPath, type Location } from "react-router";
import {
  PATH,
  getSurface,
  getSurfaceKind,
  type SurfaceId,
} from "../routes/routes";
import { useBackdropLocation } from "./use-backdrop-location";
import { findStylistBySlug } from "../data/stylist/stylist";
import type { Stylist } from "../types/stylist";

export interface RouteSurfaces {
  /** The surface the URL points at, or undefined on `/` and unknown paths. */
  top: SurfaceId | undefined;
  /** True when `top` slides in over the page beneath rather than replacing it. */
  topIsOverlay: boolean;
  /** The page showing behind an open overlay. */
  backdrop: SurfaceId | undefined;
  /**
   * The URL that backdrop page was last at. A backdrop must read its own state
   * from this, not from the live location — otherwise search results sitting
   * behind an open booking silently reset to unfiltered.
   */
  backdropLocation: Location | undefined;
  /** Resolved when the path is a stylist profile. */
  stylist: Stylist | undefined;
  notFound: boolean;
}

const slugFor = (pathname: string) =>
  matchPath("/:stylistSlug", pathname)?.params.stylistSlug;

export const isOpen = (
  { top, backdrop }: RouteSurfaces,
  surface: SurfaceId,
): boolean => top === surface || backdrop === surface;

/**
 * Resolves the current URL into the surface on screen & when that surface
 * is an overlay, the page left visible beneath it.
 */
export function useRouteSurfaces(): RouteSurfaces {
  const location = useLocation();
  const backdropLocation = useBackdropLocation();
  const { pathname } = location;

  const matchedSurface = getSurface(pathname);

  const stylist =
    matchedSurface === "profile"
      ? findStylistBySlug(slugFor(pathname))
      : undefined;
  const unresolvedProfile = matchedSurface === "profile" && !stylist;

  const top = unresolvedProfile ? undefined : matchedSurface;
  const topIsOverlay = getSurfaceKind(pathname) === "overlay";

  // Only an overlay has anything behind it; a page replaces the page before it.
  const showBackdrop = topIsOverlay && backdropLocation !== undefined;

  return {
    top,
    topIsOverlay,
    backdrop: showBackdrop ? getSurface(backdropLocation.pathname) : undefined,
    backdropLocation: showBackdrop ? backdropLocation : undefined,
    stylist,
    notFound: top === undefined && pathname !== PATH.home,
  };
}
