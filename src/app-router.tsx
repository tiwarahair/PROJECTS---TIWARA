import { createBrowserRouter } from "react-router";
import type { RouteObject } from "react-router";
import { DevHarness } from "./features/dev-harness/dev-harness";
import { DsSpecimens } from "./features/ds-specimens/ds-specimens";
import { HomePage } from "./features/home/home-page";
import { SearchPage } from "./features/search/search-page";
import { StylistProfilePage } from "./features/stylist-profile/stylist-profile-page";

// Routes from HANDOFF §2. Each screen is added here as its task lands:
// /, /search, /stylist, /book, /manage, /save-details, /account, /help,
// /email/email-change-notice, /onboarding, /studio
export const appRoutes: RouteObject[] = [
  { path: "/", element: <HomePage /> },
  { path: "/search", element: <SearchPage /> },
  { path: "/stylist", element: <StylistProfilePage /> },
  // dev-only: design-system gallery (mirrors each .card.html) and per-component fixture harnesses
  ...(import.meta.env.DEV
    ? [
        { path: "/__ds/:card", element: <DsSpecimens /> },
        { path: "/__harness/:component", element: <DevHarness /> },
      ]
    : []),
];

export const appRouter = createBrowserRouter(appRoutes);
