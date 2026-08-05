import { useEffect, useRef } from "react";
import { useLocation } from "react-router";
import { getSurfaceKind } from "../routes/routes";

/**
 * Arriving on a new page starts it at the top rather than part-way down the
 * page before it.
 *
 * Keyed on the page's own path, so opening or closing an overlay leaves the
 * page beneath exactly where the user left it — only moving between pages
 * counts as arriving somewhere new. A hashed link is left alone: the landing
 * page scrolls that into view itself, and resetting would fight it.
 */
export function useScrollReset(): void {
  const { pathname, hash } = useLocation();
  const isPage = getSurfaceKind(pathname) === "page";
  const lastPath = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!isPage || pathname === lastPath.current) return;
    lastPath.current = pathname;
    // `html { scroll-behavior: smooth }` would otherwise animate the jump,
    // showing the outgoing page scrolling away under the new one.
    if (!hash) window.scrollTo({ top: 0, behavior: "instant" });
  }, [isPage, pathname, hash]);
}
