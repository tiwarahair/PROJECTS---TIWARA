import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  getRouteForPath,
  getScreenPath,
  isScreenOnRoute,
  ROUTE_START,
} from "./onboarding-routes";
import type { useOnboarding } from "./use-onboarding";

/**
 * Keeps the URL and the screen in step: moving on to another route's screen changes the path, and browser
 * Back / Forward onto a route whose screen isn't showing starts that route over.
 */
export const useOnboardingRoute = ({
  state,
  actions,
}: ReturnType<typeof useOnboarding>) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const route = getRouteForPath(pathname) ?? "login";
  const { screen } = state;
  const previousRoute = useRef(route);

  useEffect(() => {
    const isRouteChange = previousRoute.current !== route;

    previousRoute.current = route;
    if (!screen || isScreenOnRoute(screen, route)) return;

    if (isRouteChange) actions.go(ROUTE_START[route], "back");
    else navigate(getScreenPath(screen));
    // only a new screen or route should trigger this; actions and navigate change identity every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, route]);
};
