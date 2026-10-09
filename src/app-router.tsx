import { createBrowserRouter } from "react-router";
import type { RouteObject } from "react-router";

// Routes from HANDOFF §2. Each screen is added here as its task lands:
// /, /search, /stylist, /book, /manage, /save-details, /account, /help,
// /email/email-change-notice, /onboarding, /studio
export const appRoutes: RouteObject[] = [];

export const appRouter = createBrowserRouter(appRoutes);
