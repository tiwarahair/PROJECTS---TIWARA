import { Outlet, ScrollRestoration } from "react-router";

/**
 * Root route. The prototype's screens were separate pages, so every link opened at the top and Back
 * returned to the previous scroll position; ScrollRestoration does the same for client-side routing.
 */
export const AppLayout = () => (
  <>
    <ScrollRestoration />
    <Outlet />
  </>
);
