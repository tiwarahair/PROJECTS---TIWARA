import { createBrowserRouter } from "react-router";
import type { RouteObject } from "react-router";
import { AppLayout } from "./app-layout";
import { AccountPage } from "./features/account/account-page";
import { BookingPage } from "./features/booking/booking-page";
import { DevHarness } from "./features/dev-harness/dev-harness";
import { DsSpecimens } from "./features/ds-specimens/ds-specimens";
import { ManageBookingPage } from "./features/manage-booking/manage-booking-page";
import { SaveDetailsPage } from "./features/save-details/save-details-page";
import { OnboardingPage } from "./features/onboarding/onboarding-page";
import { EmailChangeNoticePage } from "./features/email-change-notice/email-change-notice-page";
import { HelpPage } from "./features/help/help-page";
import { HomePage } from "./features/home/home-page";
import { SearchPage } from "./features/search/search-page";
import { StylistProfilePage } from "./features/stylist-profile/stylist-profile-page";
import { StudioPage } from "./features/studio/studio-page";

// Routes from HANDOFF §2. Each screen is added here as its task lands:
// /, /search, /stylist, /book, /manage, /save-details, /account, /help,
// /email/email-change-notice, /onboarding, /studio
export const appRoutes: RouteObject[] = [
  { path: "/", element: <HomePage /> },
  { path: "/search", element: <SearchPage /> },
  { path: "/stylist", element: <StylistProfilePage /> },
  { path: "/book", element: <BookingPage /> },
  { path: "/manage", element: <ManageBookingPage /> },
  { path: "/save-details", element: <SaveDetailsPage /> },
  { path: "/account", element: <AccountPage /> },
  { path: "/help", element: <HelpPage /> },
  { path: "/email/email-change-notice", element: <EmailChangeNoticePage /> },
  { path: "/onboarding", element: <OnboardingPage /> },
  { path: "/studio", element: <StudioPage /> },
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
