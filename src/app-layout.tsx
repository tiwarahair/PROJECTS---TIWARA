import { Outlet, ScrollRestoration } from "react-router";

/**
 * Root route. Every link opens at the top and Back returns to the previous scroll position, as with
 * full page loads; ScrollRestoration does this for client-side routing.
 */
export const AppLayout = () => (
  <>
    <ScrollRestoration />
    <Outlet />
  </>
);
