import { Navigate, createBrowserRouter } from "react-router";
import type { RouteObject } from "react-router";
import { AppLayout } from "./app-layout";

// preserve links shared before profiles moved to /{slug}
const OldProfileLink = () => (
  <Navigate
    to={`/${new URLSearchParams(window.location.search).get("stylist") ?? ""}`}
    replace
  />
);

const appRoutes: RouteObject[] = [
  {
    path: "/",
    lazy: () =>
      import("./features/home/home-page").then(({ HomePage }) => ({
        Component: HomePage,
      })),
  },
  {
    path: "/search",
    lazy: () =>
      import("./features/search/search-page").then(({ SearchPage }) => ({
        Component: SearchPage,
      })),
  },
  { path: "/stylist", element: <OldProfileLink /> },
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
      import("./features/manage-booking/manage-booking-page").then(
        ({ ManageBookingPage }) => ({ Component: ManageBookingPage }),
      ),
  },
  {
    path: "/save-details",
    lazy: () =>
      import("./features/save-details/save-details-page").then(
        ({ SaveDetailsPage }) => ({ Component: SaveDetailsPage }),
      ),
  },
  {
    path: "/account",
    lazy: () =>
      import("./features/account/account-page").then(({ AccountPage }) => ({
        Component: AccountPage,
      })),
  },
  {
    path: "/help",
    lazy: () =>
      import("./features/help/help-page").then(({ HelpPage }) => ({
        Component: HelpPage,
      })),
  },
  // {
  //   path: "/email/email-change-notice",
  //   element: <EmailChangeNoticePage />,
  // } /* ^ TO DO - MAKE THIS AN ACTUAL EMAIL */,
  {
    lazy: () =>
      import("./features/onboarding/onboarding-page").then(
        ({ OnboardingPage }) => ({ Component: OnboardingPage }),
      ),
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
    path: "/:slug",
    lazy: () =>
      import("./features/stylist-profile/stylist-profile-route").then(
        ({ StylistProfilePage }) => ({ Component: StylistProfilePage }),
      ),
  },
  // dev-only: design-system gallery (mirrors each .card.html) and per-component fixture harnesses
  ...(import.meta.env.DEV
    ? [
        {
          path: "/__ds/:card",
          lazy: () =>
            import("./features/ds-specimens/ds-specimens").then(
              ({ DsSpecimens }) => ({ Component: DsSpecimens }),
            ),
        },
        {
          path: "/__harness/:component",
          lazy: () =>
            import("./features/dev-harness/dev-harness").then(
              ({ DevHarness }) => ({ Component: DevHarness }),
            ),
        },
      ]
    : []),
];

export const appRouter = createBrowserRouter([
  { element: <AppLayout />, children: appRoutes },
]);
