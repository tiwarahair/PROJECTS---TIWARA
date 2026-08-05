import { useCallback } from "react";
import { useNavigate } from "react-router";
import { PATH } from "../routes/routes";
import { useBackdropLocation } from "./use-backdrop-location";

export interface SurfaceNav {
  /**
   * Leaves the current overlay for the page underneath. Overlay-only: on a
   * page the backdrop is the page itself, so this would navigate nowhere.
   */
  close: () => void;
}

export function useSurfaceNav(): SurfaceNav {
  const navigate = useNavigate();
  const backdrop = useBackdropLocation();

  // Deliberately not `navigate(-1)`. The booking wizard pushes a history entry
  // per step, so popping one lands on the previous step instead of leaving —
  // which made "Done" on the confirmation screen bounce back to Review. Jump
  // straight to the page the overlay opened over, or home on a cold deep link.
  const close = useCallback(() => {
    navigate(backdrop ? `${backdrop.pathname}${backdrop.search}` : PATH.home);
  }, [navigate, backdrop]);

  return { close };
}
