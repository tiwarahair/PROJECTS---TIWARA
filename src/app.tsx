import { LandingPage } from "./features/landing/landing-page";
import { AboutPage } from "./features/pages/about-page";
import { ForStylistsPage } from "./features/pages/stylists-page";
import { ShopPage } from "./features/pages/shop-page";
import { NotFoundPage } from "./features/pages/not-found-page";
import { HairQuizOverlay } from "./features/hair-quiz/hair-quiz-overlay";
import { OtherStyleOverlay } from "./features/other-style/other-style-overlay";
import { SearchPage } from "./features/search/search-overlay";
import { ProfilePage } from "./features/profile/profile-overlay";
import { BookingOverlay } from "./features/booking/booking-overlay";
import { AIDiscoveryOverlay } from "./features/ai-discovery/ai-discovery-overlay";
import { ChatbotWidget } from "./features/chatbot/chatbot-widget";
import { SizeGuideModal } from "./features/guides/size-guide-modal";
import { useOverlay } from "./hooks/use-overlay";
import { useRouteSurfaces } from "./hooks/use-route-surfaces";
import { useScrollReset } from "./hooks/use-scroll-reset";
import type { SurfaceId } from "./routes/routes";

/**
 * Pages mount only when the URL points at them, or when they are the page an
 * overlay has slid in over. Overlays stay mounted always
 */
export function App() {
  useOverlay();
  useScrollReset();
  const surfaces = useRouteSurfaces();
  const { top, backdrop, topIsOverlay, notFound } = surfaces;

  const showPage = (page: SurfaceId) => top === page || backdrop === page;

  // The landing is the page for `/`, and the fallback backdrop for an overlay
  // opened by a deep link, where there is no previous page to sit behind it.
  const showLanding = (!top && !notFound) || (topIsOverlay && !backdrop);

  return (
    <>
      {showLanding && <LandingPage />}
      {showPage("search") && <SearchPage />}
      {showPage("profile") && <ProfilePage />}
      {showPage("about") && <AboutPage />}
      {showPage("stylists") && <ForStylistsPage />}
      {showPage("shop") && <ShopPage />}
      {notFound && <NotFoundPage />}

      {/* overlays */}
      <HairQuizOverlay />
      <BookingOverlay />
      <AIDiscoveryOverlay />

      {/* unrouted modals */}
      <OtherStyleOverlay />
      <SizeGuideModal />

      {/* chatbot */}
      <ChatbotWidget />
    </>
  );
}
