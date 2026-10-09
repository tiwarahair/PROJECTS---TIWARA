import { createBrowserRouter } from "react-router";
import type { RouteObject } from "react-router";
import { DsSpecimens } from "./features/ds-specimens/ds-specimens";

// Routes from HANDOFF §2. Each screen is added here as its task lands:
// /, /search, /stylist, /book, /manage, /save-details, /account, /help,
// /email/email-change-notice, /onboarding, /studio
export const appRoutes: RouteObject[] = [
  // dev-only design-system gallery, mirrors design_system_source/*.card.html
  ...(import.meta.env.DEV
    ? [{ path: "/__ds/:card", element: <DsSpecimens /> }]
    : []),
];

export const appRouter = createBrowserRouter(appRoutes);
