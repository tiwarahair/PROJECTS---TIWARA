import { createBrowserRouter } from "react-router";
import type { RouteObject } from "react-router";
import { AppLayout } from "./app-layout";
import { NotFoundPage } from "./features/page-states/not-found";
import { RouteError } from "./features/page-states/route-error";

// reserved for pages not built yet, so they don't open as a stylist profile
const UNBUILT_PAGES = [
  "about",
  "for-stylists",
  "policies",
  "terms-of-service",
  "privacy-policy",
  "cookies",
];

const appRoutes: RouteObject[] = [
  {
    path: "/",
    lazy: () =>
      import("./features/home").then(({ HomePage }) => ({
        Component: HomePage,
      })),
  },
  {
    path: "/search",
    lazy: () =>
      import("./features/search").then(({ SearchPage }) => ({
        Component: SearchPage,
      })),
  },
  {
    path: "/book",
    lazy: () =>
      import("./features/booking/route").then(({ BookingPage }) => ({
        Component: BookingPage,
      })),
  },
  {
    path: "/manage",
    lazy: () =>
      import("./features/manage-booking").then(({ ManageBookingPage }) => ({
        Component: ManageBookingPage,
      })),
  },
  {
    path: "/pay",
    lazy: () =>
      import("./features/pay-fee").then(({ PayFeePage }) => ({
        Component: PayFeePage,
      })),
  },
  {
    path: "/confirm",
    lazy: () =>
      import("./features/confirm-booking").then(({ ConfirmBookingPage }) => ({
        Component: ConfirmBookingPage,
      })),
  },
  {
    path: "/card",
    lazy: () =>
      import("./features/update-card").then(({ UpdateCardPage }) => ({
        Component: UpdateCardPage,
      })),
  },
  {
    path: "/review",
    lazy: () =>
      import("./features/review").then(({ ReviewPage }) => ({
        Component: ReviewPage,
      })),
  },
  {
    path: "/appeal",
    lazy: () =>
      import("./features/appeal").then(({ AppealPage }) => ({
        Component: AppealPage,
      })),
  },
  {
    path: "/save-details",
    lazy: () =>
      import("./features/save-details").then(({ SaveDetailsPage }) => ({
        Component: SaveDetailsPage,
      })),
  },
  {
    path: "/account",
    lazy: () =>
      import("./features/account").then(({ AccountPage }) => ({
        Component: AccountPage,
      })),
  },
  {
    path: "/reviews",
    lazy: () =>
      import("./features/review-policy").then(({ ReviewPolicyPage }) => ({
        Component: ReviewPolicyPage,
      })),
  },
  {
    path: "/help",
    lazy: () =>
      import("./features/help").then(({ HelpPage }) => ({
        Component: HelpPage,
      })),
  },
  {
    lazy: () =>
      import("./features/onboarding").then(({ OnboardingPage }) => ({
        Component: OnboardingPage,
      })),
    children: [{ path: "/login" }, { path: "/signup" }, { path: "/join" }],
  },
  {
    path: "/studio",
    lazy: () =>
      import("./features/studio/route").then(({ StudioRoute }) => ({
        Component: StudioRoute,
      })),
  },
  {
    path: "/admin",
    lazy: () =>
      import("./features/admin/route").then(({ AdminRoute }) => ({
        Component: AdminRoute,
      })),
  },
  {
    path: "/:slug",
    lazy: () =>
      import("./features/stylist-profile/route").then(
        ({ StylistProfilePage }) => ({ Component: StylistProfilePage }),
      ),
  },
  ...UNBUILT_PAGES.map((page) => ({
    path: `/${page}`,
    element: <NotFoundPage />,
  })),
  { path: "*", element: <NotFoundPage /> },
];

export const appRouter = createBrowserRouter([
  { element: <AppLayout />, errorElement: <RouteError />, children: appRoutes },
]);
