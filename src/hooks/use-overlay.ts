import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../stores/hooks";
import {
  aiDiscoveryClosed,
  bookingClosed,
  lengthGuideClosed,
  profileClosed,
  searchClosed,
  sizeGuideClosed,
} from "../stores/overlays-slice";
import { ESCAPE_PRIORITY, type OverlayId } from "../types/overlays";

const CLOSE_ACTION = {
  sizeGuide: sizeGuideClosed,
  lengthGuide: lengthGuideClosed,
  booking: bookingClosed,
  aiDiscovery: aiDiscoveryClosed,
  profile: profileClosed,
  search: searchClosed,
} as const satisfies Record<OverlayId, unknown>;

/**
 * Overlay behaviour:
 * - Page scroll is locked while any full-screen overlay is open
 * - Escape closes the topmost overlay
 */
export function useOverlay(): void {
  const dispatch = useAppDispatch();
  const overlay = useAppSelector((state) => state.overlays.overlay);

  const lockBodyScroll =
    overlay.search || overlay.profile || overlay.booking || overlay.aiDiscovery;

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
    if (topmost) dispatch(CLOSE_ACTION[topmost]());
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
