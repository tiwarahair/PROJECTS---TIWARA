import { Navigate, createBrowserRouter } from "react-router";
import type { RouteObject } from "react-router";
import { AppLayout } from "./app-layout";
import { AccountPage } from "./features/account/account-page";
import { BookingPage } from "./features/booking/booking-page";
import { DevHarness } from "./features/dev-harness/dev-harness";
import { DsSpecimens } from "./features/ds-specimens/ds-specimens";
import { ManageBookingPage } from "./features/manage-booking/manage-booking-page";
import { SaveDetailsPage } from "./features/save-details/save-details-page";
import { OnboardingPage } from "./features/onboarding/onboarding-page";
import { HelpPage } from "./features/help/help-page";
import { HomePage } from "./features/home/home-page";
import { SearchPage } from "./features/search/search-page";
import { StylistProfilePage } from "./features/stylist-profile/stylist-profile-route";
import { StudioRoute } from "./features/studio/studio-route";

// preserve links shared before profiles moved to /{slug}
const OldProfileLink = () => (
  <Navigate
    to={`/${new URLSearchParams(window.location.search).get("stylist") ?? ""}`}
    replace
  />
);

const appRoutes: RouteObject[] = [
  { path: "/", element: <HomePage /> },
  { path: "/search", element: <SearchPage /> },
  { path: "/stylist", element: <OldProfileLink /> },
  { path: "/book", element: <BookingPage /> },
  { path: "/manage", element: <ManageBookingPage /> },
  { path: "/save-details", element: <SaveDetailsPage /> },
  { path: "/account", element: <AccountPage /> },
  { path: "/help", element: <HelpPage /> },
  // {
  //   path: "/email/email-change-notice",
  //   element: <EmailChangeNoticePage />,
  // } /* ^ TO DO - MAKE THIS AN ACTUAL EMAIL */,
  {
    element: <OnboardingPage />,
    children: [{ path: "/login" }, { path: "/signup" }, { path: "/join" }],
  },
  { path: "/studio", element: <StudioRoute /> },
  { path: "/:slug", element: <StylistProfilePage /> },
  // dev-only: design-system gallery (mirrors each .card.html) and per-component fixture harnesses
  ...(import.meta.env.DEV
    ? [
        { path: "/__ds/:card", element: <DsSpecimens /> },
        { path: "/__harness/:component", element: <DevHarness /> },
      ]
    : []),
];

export const appRouter = createBrowserRouter([
  { element: <AppLayout />, children: appRoutes },
]);
