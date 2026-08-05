import { createContext, use, useRef, type ReactNode } from "react";
import { useLocation, type Location } from "react-router";
import { getSurfaceKind } from "../routes/routes";

const BackdropContext = createContext<Location | undefined>(undefined);

/**
 * Remembers the last page the user was on, so an overlay slides in over that
 * page rather than over the landing — opening a booking from /shop should
 * leave the shop visible underneath.
 *
 * Roughly ten places open an overlay.
 */
export function BackdropProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const lastPage = useRef<Location | undefined>(undefined);

  // Written during render, not in an effect: an effect runs after paint, so
  // the overlay's first frame would have nothing behind it and the page would
  // visibly flash in mid-transition.
  if (getSurfaceKind(location.pathname) === "page") lastPage.current = location;

  return <BackdropContext value={lastPage.current}>{children}</BackdropContext>;
}

/** The page showing beneath the current overlay, if any. */
export const useBackdropLocation = () => use(BackdropContext);
