import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../stores/hooks";
import {
  aiDiscoveryClosed,
  bookingClosed,
  lengthGuideClosed,
  pageClosed,
  profileClosed,
  searchClosed,
  sizeGuideClosed,
} from "../stores/overlays-slice";
import {
  ESCAPE_PRIORITY,
  SCROLL_LOCKING,
  type OverlayId,
  type SimpleOverlayId,
} from "../types/overlays";

/** Overlays whose close carries extra semantics, so each has its own action. */
const CLOSE_ACTION = {
  sizeGuide: sizeGuideClosed,
  lengthGuide: lengthGuideClosed,
  booking: bookingClosed,
  aiDiscovery: aiDiscoveryClosed,
  profile: profileClosed,
  search: searchClosed,
} as const;

function closeActionFor(id: OverlayId) {
  return id in CLOSE_ACTION
    ? CLOSE_ACTION[id as keyof typeof CLOSE_ACTION]()
    : pageClosed(id as SimpleOverlayId);
}

/**
 * Overlay behaviour:
 * - Page scroll is locked while any full-screen overlay is open
 * - Escape closes the topmost overlay
 */
export function useOverlay(): void {
  const dispatch = useAppDispatch();
  const overlay = useAppSelector((state) => state.overlays.overlay);

  const lockBodyScroll = SCROLL_LOCKING.some((id) => overlay[id]);

  // Locks page scrolling while any full-screen overlay is open.
  useEffect(() => {
    if (!lockBodyScroll) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [lockBodyScroll]);

  // Run `onEscape` when Escape key is pressed
  const onEscape = () => {
    const topmost = ESCAPE_PRIORITY.find((id) => overlay[id]);
    if (topmost) dispatch(closeActionFor(topmost));
  };

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
