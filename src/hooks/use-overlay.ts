import { useEffect, useRef } from "react";
import { useLocation } from "react-router";
import { useAppDispatch, useAppSelector } from "../stores/hooks";
import { modalClosed, type ModalId } from "../stores/modals-slice";
import { getTitle as routeTitle } from "../routes/routes";
import { useRouteSurfaces } from "./use-route-surfaces";
import { useSurfaceNav } from "./use-surface-nav";

const BRAND = "Tiwara's House";

/**
 * index.html carries a longer, search-friendly title for the landing page.
 * Captured once at load so navigating home restores it rather than replacing
 * it with the bare brand name.
 */
const LANDING_TITLE = document.title || BRAND;

/**
 * Escape closes the topmost thing. The two unrouted modals sit above every
 * surface, and below them "topmost" is just whatever the URL points at, so the
 * old ten-entry priority list collapses to this.
 */
const MODAL_PRIORITY: readonly ModalId[] = ["sizeGuide", "otherStyle"];

function getTitle(pathname: string, stylistName?: string, notFound?: boolean) {
  if (notFound) return `Page not found · ${BRAND}`;
  // The flagship stylist shares the platform's name, so avoid "X · X".
  if (stylistName) {
    return stylistName === BRAND ? BRAND : `${stylistName} · ${BRAND}`;
  }
  const title = routeTitle(pathname);
  return title ? `${title} · ${BRAND}` : LANDING_TITLE;
}

/**
 * App-level route effects: page scroll is locked while a surface covers the
 * page, Escape dismisses the topmost layer, and the tab title tracks the route.
 */
export function useOverlay(): void {
  const dispatch = useAppDispatch();
  const modals = useAppSelector((state) => state.modals);
  const surfaces = useRouteSurfaces();
  const { close } = useSurfaceNav();
  const { pathname } = useLocation();

  // Only overlays cover the viewport. Pages scroll normally, and the modals
  // never locked scrolling in the first place.
  const lockBodyScroll = surfaces.topIsOverlay;

  useEffect(() => {
    if (!lockBodyScroll) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [lockBodyScroll]);

  const stylistName = surfaces.stylist?.name;
  const { notFound } = surfaces;
  useEffect(() => {
    document.title = getTitle(pathname, stylistName, notFound);
  }, [pathname, stylistName, notFound]);

  const onEscape = () => {
    const modal = MODAL_PRIORITY.find((id) => modals[id]);
    if (modal) dispatch(modalClosed(modal));
    // Escape dismisses an overlay. On a page there is nothing to dismiss —
    // the browser's own Back is the way out.
    else if (surfaces.topIsOverlay) close();
  };

  // Held in a ref so the listener attaches once rather than on every
  // navigation, matching the original.
  const handler = useRef(onEscape);
  handler.current = onEscape;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") handler.current();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);
}
