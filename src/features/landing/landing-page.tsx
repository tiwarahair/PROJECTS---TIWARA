import { useEffect } from "react";
import { useLocation } from "react-router";
import { Header } from "./header";
import { HeroSection } from "./hero-section";
import { FeaturedStylists } from "./featured-stylists";
import { ServicesGrid } from "./services-grid";
import { QuizTeaser } from "./quiz-teaser";
import { IntroSection } from "./intro-section";
import { TestimonialsSection } from "./testimonials-section";
import { ShopSection } from "./shop-section";
import { Footer } from "./footer";

export function LandingPage() {
  const { hash } = useLocation();

  // `/#services` from another route lands here before the target exists, so
  // the scroll is done on the hash rather than left to the browser.
  //
  // Deferred because child effects run before parent ones: arriving from
  // /shop, useOverlay has not yet released `body { overflow: hidden }`, and
  // scrolling while it is still set does nothing. A timer rather than
  // requestAnimationFrame, which never fires while the tab is in the
  // background — the scroll would then be skipped entirely.
  useEffect(() => {
    if (!hash) return;
    const timer = setTimeout(() => {
      document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" });
    }, 0);
    return () => clearTimeout(timer);
  }, [hash]);

  return (
    <>
      <Header />
      <HeroSection />
      <FeaturedStylists />
      <ServicesGrid />
      <QuizTeaser />
      <IntroSection />
      <TestimonialsSection />
      <ShopSection />
      <Footer />
    </>
  );
}
