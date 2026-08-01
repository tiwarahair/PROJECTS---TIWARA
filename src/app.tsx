import { LandingPage } from "./features/landing/landing-page";
import { SearchOverlay } from "./features/search/search-overlay";
import { ProfileOverlay } from "./features/profile/profile-overlay";
import { BookingOverlay } from "./features/booking/booking-overlay";
import { AIDiscoveryOverlay } from "./features/ai-discovery/ai-discovery-overlay";
import { ChatbotWidget } from "./features/chatbot/chatbot-widget";
import { SizeGuideModal } from "./features/guides/size-guide-modal";
import { LengthGuideModal } from "./features/guides/length-guide-modal";
import { useOverlay } from "./hooks/use-overlay";

/**
 * Every overlay stays mounted. They show and hide by toggling `.open`, which
 * drives slide/fade transitions that conditional rendering would skip.
 */
export function App() {
  useOverlay();

  return (
    <>
      <LandingPage />

      {/* overlays */}
      <SearchOverlay />
      <ProfileOverlay />
      <BookingOverlay />
      <AIDiscoveryOverlay />

      {/* modals */}
      <SizeGuideModal />
      <LengthGuideModal />

      {/* chatbot */}
      <ChatbotWidget />
    </>
  );
}
